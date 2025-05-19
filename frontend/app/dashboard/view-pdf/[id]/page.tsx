"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux/hooks';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaDownload, FaUsers, FaArrowLeft, FaArrowRight, FaLongArrowAltLeft, FaLongArrowAltRight } from 'react-icons/fa';

// Type definitions
interface User {
  id: string;
  email: string;
  role: string;
}

declare global {
  interface Window {
    PDFTron: any;
  }
}

export default function ViewPDF() {
  const params = useParams();
  const router = useRouter();
  const user = useAppSelector(state => state.user);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileRole, setFileRole] = useState<string>('viewer');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(4); // Default is 100%
  const [zoomValue, setZoomValue] = useState<number>(100);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Zoom levels mapping
  const zoomLevels = [50, 75, 90, 100, 125, 150, 200];
  
  // Annotation states
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [fontFamily, setFontFamily] = useState<string>('Helvetica');
  const [fontSize, setFontSize] = useState<number>(12);
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [fillColor, setFillColor] = useState<string>('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState<number>(1);
  const [strokeOpacity, setStrokeOpacity] = useState<number>(100);
  const [fillOpacity, setFillOpacity] = useState<number>(0);
  const [textColor, setTextColor] = useState<string>('#000000');
  
  // Load file
  useEffect(() => {
    if (!user.isAuthenticated) return;
    
    const fileId = params?.id as string;
    if (!fileId) return;
    
    // Fetch file data and users
    const fetchFileData = async () => {
      try {
        const fileResponse = await fetch(`/api/file/${fileId}/users`, {
          credentials: 'include',
        });
        
        if (fileResponse.ok) {
          const data = await fileResponse.json();
          setUsers(data);
          // Find current user's role
          const currentUser = data.find((u: User) => u.email === user.email);
          if (currentUser) {
            setFileRole(currentUser.role);
          }
        }
      } catch (error) {
        console.error('Error fetching file data:', error);
      }
    };
    
    fetchFileData();
    
    // Initialize PDF viewer if the div exists
    if (viewerRef.current) {

      // Dynamically import WebViewer using a more reliable method
      const loadWebViewer = async () => {
        try {
          // Use dynamic import to load WebViewer
          // The following line requires TypeScript to ignore it as WebViewer's
          // types don't match exactly with how we're using it
          const WebViewerModule = await import('@pdftron/webviewer');
          const WebViewer = WebViewerModule.default || WebViewerModule;
          
          // Force type assertion for the div reference
          const viewerElement = viewerRef.current as HTMLElement;
          
          // Create the WebViewer instance
          const instance = await WebViewer(
            {
              path: '/webviewer',
              disabledElements: [
                'header',
                'toolsHeader'
              ],
              licenseKey: process.env.NEXT_APP_PDFTRON_LICENSE_KEY,
              fullAPI: true,
              enableAnnotations: true,
            },
            viewerElement
          );
          
          setInstance(instance);
          const { Core, UI } = instance;
          
          const typedUI = UI as any;
          
          // Load the document after initialization
          await typedUI.loadDocument(`/api/file/${fileId}/download`);
          
          // Get file name from the document
          typedUI.addEventListener('documentLoaded', () => {
            setLoading(false);
            setFileName(typedUI.getDocumentViewer().getDocument().getFilename() || `Document-${fileId}`);
            setTotalPages(typedUI.getDocumentViewer().getPageCount());
            
            // Set the zoom level to the default (100%)
            typedUI.setZoomLevel(1);
            setZoomValue(100);
            
            // Handle error if any
            if (typedUI.getDocumentViewer().getDocument().getError()) {
              setError('Failed to load document');
            }
          });
          
          // Listen for critical errors during document loading
          typedUI.addEventListener('loaderror', (err: any, eventType: string, coreError: any) => {
            console.error("WebViewer Event: loaderror - Critical error during document loading.");
            console.error("Error Object (err):", JSON.stringify(err, Object.getOwnPropertyNames(err)));
            console.error("EventType:", eventType);
            if (coreError) {
              console.error("Core Error Object:", JSON.stringify(coreError, Object.getOwnPropertyNames(coreError)));
            }
            
            let message = 'Unknown error loading document.';
            if (err && err.message) {
              message = err.message;
            } else if (coreError && coreError.message) {
              message = coreError.message;
            } else if (typeof err === 'string') {
              message = err;
            }

            setError(`Failed to load document: ${message}`);
            setLoading(false);
          });
          
          // Listen for page change events
          typedUI.addEventListener('pageNumberUpdated', (pageNumber: number) => {
            setCurrentPage(pageNumber);
          });
          
          // Listen for zoom changes
          typedUI.addEventListener('zoomUpdated', (zoom: number) => {
            const zoomPercent = Math.round(zoom * 100);
            setZoomValue(zoomPercent);
            
            // Find closest zoom level
            const closestIndex = zoomLevels.reduce((prev, curr, index) => 
              Math.abs(curr - zoomPercent) < Math.abs(zoomLevels[prev] - zoomPercent) ? index : prev, 0);
            setZoomLevel(closestIndex + 1);
          });
          
          // Listen for annotation changes
          typedUI.addEventListener('annotationChanged', (annotations: any, action: string) => {
            if (fileRole === 'viewer') return;
            
            // Save annotations to server
            if (['add', 'modify', 'delete'].includes(action)) {
              saveAnnotations(instance);
            }
          });
        } catch (error) {
          console.error('Error loading WebViewer:', error);
          setLoading(false);
          setError('Failed to load PDF viewer. Make sure WebViewer assets are properly installed.');
        }
      };
      
      loadWebViewer();
    }
    
    return () => {
      // Cleanup WebViewer
      if (instance) {
        // Cast to any to avoid TypeScript errors
        (instance as any).UI.dispose();
      }
    };
  }, [params, user.isAuthenticated, user.email]);
  
  // Save annotations to server
  const saveAnnotations = async (instance: any) => {
    if (!instance || fileRole === 'viewer') return;
    
    try {
      const { annotationManager } = instance.Core;
      const fileId = params?.id as string;
      const xfdfString = await annotationManager.exportAnnotations();
      
      // Send annotations to server
      await fetch(`/api/file/${fileId}/annotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xml: xfdfString }),
        credentials: 'include',
      });
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      toast.error('Failed to save annotations');
    }
  };
  
  // Handle page navigation
  const goToPage = (page: number) => {
    if (!instance) return;
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    instance.UI.setCurrentPage(page);
    setCurrentPage(page);
  };
  
  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (!isNaN(page)) {
      goToPage(page);
    }
  };
  
  // Handle zoom change
  const changeZoom = (level: number) => {
    if (!instance) return;
    
    setZoomLevel(level);
    const zoomPercent = zoomLevels[level - 1];
    setZoomValue(zoomPercent);
    instance.UI.setZoomLevel(zoomPercent / 100);
  };
  
  // Handle zoom input change
  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let zoom = parseInt(e.target.value);
    
    if (isNaN(zoom)) return;
    
    // Clamp zoom value
    if (zoom < 50) zoom = 50;
    if (zoom > 200) zoom = 200;
    
    setZoomValue(zoom);
    
    if (instance) {
      instance.UI.setZoomLevel(zoom / 100);
    }
  };
  
  // Handle tool selection
  const selectTool = (tool: string) => {
    if (!instance) return;
    
    setSelectedTool(tool);
    const { Tools } = instance.Core;
    
    switch (tool) {
      case 'rectangle':
        instance.UI.setToolMode(Tools.ToolNames.RECTANGLE);
        break;
      case 'ellipse':
        instance.UI.setToolMode(Tools.ToolNames.ELLIPSE);
        break;
      case 'line':
        instance.UI.setToolMode(Tools.ToolNames.LINE);
        break;
      case 'arrow':
        instance.UI.setToolMode(Tools.ToolNames.ARROW);
        break;
      case 'polygon':
        instance.UI.setToolMode(Tools.ToolNames.POLYGON);
        break;
      case 'freetext':
        instance.UI.setToolMode(Tools.ToolNames.FREETEXT);
        break;
      default:
        instance.UI.setToolMode(Tools.ToolNames.PAN);
        break;
    }
    
    // Apply current styles to the tool
    applyCurrentStyles();
  };
  
  // Apply current styles to the selected tool
  const applyCurrentStyles = () => {
    if (!instance) return;
    
    const { annotationManager, Annotations } = instance.Core;
    
    // Get current tool
    const tool = instance.UI.getToolMode();
    if (!tool || !tool.name) return;
    
    // Apply styles based on tool type
    if (tool.name.includes('FREETEXT')) {
      // Text annotation styles
      tool.defaults.FontSize = fontSize;
      tool.defaults.StrokeColor = new Annotations.Color(strokeColor);
      tool.defaults.TextColor = new Annotations.Color(textColor);
      tool.defaults.FillColor = new Annotations.Color(fillColor);
      tool.defaults.StrokeThickness = strokeWidth;
      tool.defaults.Opacity = strokeOpacity / 100;
      tool.defaults.FillOpacity = fillOpacity / 100;
      
      // Find and apply font family
      const fonts = annotationManager.getFontStyles();
      if (fonts.includes(fontFamily)) {
        tool.defaults.Font = fontFamily;
      }
    } else if (tool.name) {
      // Shape annotation styles
      tool.defaults.StrokeColor = new Annotations.Color(strokeColor);
      tool.defaults.FillColor = new Annotations.Color(fillColor);
      tool.defaults.StrokeThickness = strokeWidth;
      tool.defaults.Opacity = strokeOpacity / 100;
      tool.defaults.FillOpacity = fillOpacity / 100;
    }
  };
  
  // Handle download
  const handleDownload = async () => {
    const fileId = params?.id as string;
    if (!fileId) return;
    
    try {
      // Trigger file download
      window.open(`/api/file/${fileId}/download`, '_blank');
      toast.success('Document download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download document');
    }
  };
  
  // Search user by email
  const searchUser = async () => {
    if (!searchEmail) return;
    
    try {
      const response = await fetch(`/api/auth/user-by-email?email=${searchEmail}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
      } else {
        setSearchResult(null);
        toast.error('User not found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search user');
    }
  };
  
  // Invite user
  const inviteUser = async (email: string, role: string) => {
    const fileId = params?.id as string;
    if (!fileId) return;
    
    try {
      const response = await fetch('/api/file/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, email, role }),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success(`User invited with ${role} role`);
        // Refresh users list
        const fileResponse = await fetch(`/api/file/${fileId}/users`, {
          credentials: 'include',
        });
        
        if (fileResponse.ok) {
          const data = await fileResponse.json();
          setUsers(data);
        }
        
        setSearchEmail('');
        setSearchResult(null);
      } else {
        toast.error('Failed to invite user');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to invite user');
    }
  };
  
  // Change user role
  const changeUserRole = async (userId: string, role: string) => {
    const fileId = params?.id as string;
    if (!fileId) return;
    
    try {
      const response = await fetch('/api/file/change-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, userId, role }),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success(`User role changed to ${role === 'none' ? 'removed' : role}`);
        // Refresh users list
        const fileResponse = await fetch(`/api/file/${fileId}/users`, {
          credentials: 'include',
        });
        
        if (fileResponse.ok) {
          const data = await fileResponse.json();
          setUsers(data);
        }
      } else {
        toast.error('Failed to change user role');
      }
    } catch (error) {
      console.error('Error changing user role:', error);
      toast.error('Failed to change user role');
    }
  };
  
  // If not authenticated, show loading or redirect
  if (!user.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }
  
  // If error loading file
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => router.push('/dashboard/document-list')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Return to Document List
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center">
          <button 
            onClick={() => router.push('/dashboard/document-list')}
            className="text-gray-600 hover:text-gray-800 mr-4"
          >
            <FaArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-medium truncate">{fileName || 'Loading document...'}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {fileRole === 'owner' && (
            <button 
              onClick={() => setShowPermissionDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm"
            >
              <FaUsers size={14} /> Manage Users
            </button>
          )}
          
          <button 
            onClick={handleDownload}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm"
          >
            <FaDownload size={14} /> Download
          </button>
        </div>
      </div>
      
      {/* Main viewer area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar - Only for editors/owners */}
        {(fileRole === 'editor' || fileRole === 'owner') && (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
            <h2 className="font-medium mb-4">Annotation Tools</h2>
            
            {/* Shape tools */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Shapes</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button 
                  onClick={() => selectTool('rectangle')}
                  className={`p-2 border rounded-md ${selectedTool === 'rectangle' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 border border-current"></div>
                </button>
                <button 
                  onClick={() => selectTool('ellipse')}
                  className={`p-2 border rounded-md ${selectedTool === 'ellipse' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 rounded-full border border-current"></div>
                </button>
                <button 
                  onClick={() => selectTool('line')}
                  className={`p-2 border rounded-md ${selectedTool === 'line' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 flex items-center">
                    <div className="w-full h-0.5 bg-current"></div>
                  </div>
                </button>
                <button 
                  onClick={() => selectTool('arrow')}
                  className={`p-2 border rounded-md ${selectedTool === 'arrow' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 flex items-center">
                    <div className="relative w-full h-0.5 bg-current">
                      <div className="absolute right-0 border-x-4 border-y-3 border-x-transparent border-y-current transform -translate-y-1/2"></div>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => selectTool('polygon')}
                  className={`p-2 border rounded-md ${selectedTool === 'polygon' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 relative">
                    <div className="absolute left-2 top-0 right-2 bottom-0 border border-current transform rotate-12"></div>
                  </div>
                </button>
                <button 
                  onClick={() => selectTool('freetext')}
                  className={`p-2 border rounded-md ${selectedTool === 'freetext' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
                >
                  <div className="w-full h-6 flex items-center justify-center text-xs">Text</div>
                </button>
              </div>
            </div>
            
            {/* Free text options */}
            {selectedTool === 'freetext' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Text Options</h3>
                
                <div className="mb-3">
                  <label className="text-xs text-gray-600">Font Family</label>
                  <select 
                    value={fontFamily} 
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      applyCurrentStyles();
                    }}
                    className="w-full border border-gray-300 rounded-md text-sm p-1.5"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                    <option value="Arial">Arial</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="text-xs text-gray-600">Font Size</label>
                  <select 
                    value={fontSize} 
                    onChange={(e) => {
                      setFontSize(parseInt(e.target.value));
                      applyCurrentStyles();
                    }}
                    className="w-full border border-gray-300 rounded-md text-sm p-1.5"
                  >
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
                    <option value="24">24</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="text-xs text-gray-600">Text Color</label>
                  <input 
                    type="color" 
                    value={textColor} 
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      applyCurrentStyles();
                    }}
                    className="w-full border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
            
            {/* Common options for all annotations */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Style Options</h3>
              
              <div className="mb-3">
                <label className="text-xs text-gray-600">Stroke Color</label>
                <input 
                  type="color" 
                  value={strokeColor} 
                  onChange={(e) => {
                    setStrokeColor(e.target.value);
                    applyCurrentStyles();
                  }}
                  className="w-full border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-3">
                <label className="text-xs text-gray-600">Fill Color</label>
                <input 
                  type="color" 
                  value={fillColor} 
                  onChange={(e) => {
                    setFillColor(e.target.value);
                    applyCurrentStyles();
                  }}
                  className="w-full border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-600">Stroke Width: {strokeWidth}</label>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={strokeWidth} 
                  onChange={(e) => {
                    setStrokeWidth(parseInt(e.target.value));
                    applyCurrentStyles();
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-600">Stroke Opacity: {strokeOpacity}%</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={strokeOpacity} 
                  onChange={(e) => {
                    setStrokeOpacity(parseInt(e.target.value));
                    applyCurrentStyles();
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-600">Fill Opacity: {fillOpacity}%</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={fillOpacity} 
                  onChange={(e) => {
                    setFillOpacity(parseInt(e.target.value));
                    applyCurrentStyles();
                  }}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Reset tool */}
            <button 
              onClick={() => selectTool('')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md text-sm"
            >
              Pan Tool (Reset)
            </button>
          </div>
        )}
        
        {/* Main PDF viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top controls */}
          <div className="bg-white p-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => goToPage(1)}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={currentPage === 1 || loading}
              >
                <FaLongArrowAltLeft size={16} />
              </button>
              <button 
                onClick={() => goToPage(currentPage - 1)}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={currentPage === 1 || loading}
              >
                <FaArrowLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  value={currentPage}
                  onChange={handlePageInputChange}
                  min={1}
                  max={totalPages}
                  className="w-12 border border-gray-300 rounded-md px-1 py-0.5 text-center text-sm"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">/ {totalPages}</span>
              </div>
              
              <button 
                onClick={() => goToPage(currentPage + 1)}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={currentPage === totalPages || loading}
              >
                <FaArrowRight size={16} />
              </button>
              <button 
                onClick={() => goToPage(totalPages)}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={currentPage === totalPages || loading}
              >
                <FaLongArrowAltRight size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeZoom(Math.max(1, zoomLevel - 1))}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={zoomLevel === 1 || loading}
              >
                -
              </button>
              
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  value={zoomValue}
                  onChange={handleZoomInputChange}
                  min={50}
                  max={200}
                  className="w-16 border border-gray-300 rounded-md px-1 py-0.5 text-center text-sm"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              
              <button 
                onClick={() => changeZoom(Math.min(7, zoomLevel + 1))}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                disabled={zoomLevel === 7 || loading}
              >
                +
              </button>
            </div>
          </div>
          
          {/* PDF viewer container */}
          <div className="flex-1 overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                <p className="text-gray-600">Loading document...</p>
              </div>
            )}
            <div ref={viewerRef} className="h-full"></div>
          </div>
        </div>
      </div>
      
      {/* Permissions dialog */}
      {showPermissionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-medium">Manage File Permissions</h2>
              <button 
                onClick={() => {
                  setShowPermissionDialog(false);
                  setSearchEmail('');
                  setSearchResult(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 border-b">
              <h3 className="font-medium mb-2">Invite Users</h3>
              <div className="flex gap-2 mb-4">
                <input 
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter user email"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button 
                  onClick={searchUser}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Search
                </button>
              </div>
              
              {searchResult && (
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{searchResult.name || 'User'}</p>
                      <p className="text-sm text-gray-600">{searchResult.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => inviteUser(searchResult.email, 'viewer')}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Invite as Viewer
                      </button>
                      <button 
                        onClick={() => inviteUser(searchResult.email, 'editor')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Invite as Editor
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-medium mb-2">Current Users</h3>
              
              {users.length > 0 ? (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <p>{user.email}</p>
                        <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                      </div>
                      
                      {user.role !== 'owner' && (
                        <select 
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="none">Remove</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Toast container */}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}