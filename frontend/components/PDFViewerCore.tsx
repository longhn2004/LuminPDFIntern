import { useEffect, useState, useRef } from 'react';
import Script from "next/script";
import PDFNavigationBar from './PageControlBar';
import AnnotationPanel from './AnnotationPanel';
import { zoomIn, zoomOut, setZoom } from './ZoomControls';
import { MIN_ZOOM, MAX_ZOOM } from './ZoomConstants';

interface PDFViewerCoreProps {
  pdfId: string;
}

export default function PDFViewerCore({ pdfId }: PDFViewerCoreProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing viewer...");
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoleError, setUserRoleError] = useState<string | null>(null);
  const [isUserRoleLoading, setIsUserRoleLoading] = useState<boolean>(true);

  const hasInitializedRef = useRef(false);
  const documentViewerRef = useRef<any>(null);
  const annotationManagerRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  const currentVersionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserRole = async (currentPdfId: string) => {
    if (!currentPdfId) return;
    setIsUserRoleLoading(true);
    setUserRoleError(null);
    try {
      console.log(`PDFViewerCore: Fetching user role for pdfId=${currentPdfId}`);
      const response = await fetch(`/api/file/${currentPdfId}/user-role`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch user role: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('PDFViewerCore: User role fetched:', data.role);
      setUserRole(data.role);
    } catch (err: any) {
      console.error("PDFViewerCore: Error fetching user role:", err);
      setUserRoleError(err.message || "Could not load user permissions.");
      setUserRole(null);
    } finally {
      setIsUserRoleLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (userRole == 'viewer') {
      console.log("PDFViewerCore: Skipping annotation loading, userRole:", userRole);
      return;
    }
    if (!pdfId || !annotationManagerRef.current) {
      console.log("PDFViewerCore: Skipping annotation loading", { pdfId, hasAnnotationManager: !!annotationManagerRef.current });
      return;
    }
    try {
      console.log(`PDFViewerCore: Loading annotations for pdfId=${pdfId}`);
      const response = await fetch(`/api/file/${pdfId}/annotation`);
      if (!response.ok) {
        throw new Error(`Failed to load annotations: ${response.statusText}`);
      }
      const { xfdf, version } = await response.json();
      currentVersionRef.current = version || 0;
      if (xfdf) {
        await annotationManagerRef.current.importAnnotations(xfdf);
        console.log('PDFViewerCore: Annotations imported', annotationManagerRef.current.getAnnotationsList());
        annotationManagerRef.current.drawAnnotationsFromList(annotationManagerRef.current.getAnnotationsList());
        console.log("PDFViewerCore: Annotations loaded and drawn, version:", currentVersionRef.current);
      } else {
        console.log("PDFViewerCore: No annotations found");
      }
    } catch (error) {
      console.error("PDFViewerCore: Error loading annotations:", error);
    }
  };

  const saveAnnotations = async () => {
    if (userRole == 'viewer') {
      console.log("PDFViewerCore: Cannot save annotations, userRole:", userRole);
      return;
    }
    try {
      console.log(`PDFViewerCore: Saving annotations for pdfId=${pdfId}`);
      const xfdf = await annotationManagerRef.current.exportAnnotations();
      const response = await fetch(`/api/file/${pdfId}/annotation/save`, {
        method: "POST",
        body: JSON.stringify({ xfdf }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        if (response.status === 409) {
          alert("Conflict detected: Another user modified the annotations. Please refresh.");
          return;
        }
        throw new Error(`Failed to save annotations: ${response.statusText}`);
      }
      const { version, responsexfdf } = await response.json();
      currentVersionRef.current = version;
      console.log("PDFViewerCore: Annotations saved, version:", currentVersionRef.current);
      await documentViewerRef.current.getAnnotationManager().importAnnotations(responsexfdf);
      console.log('PDFViewerCore: Annotations imported', documentViewerRef.current.getAnnotationManager().getAnnotationsList());
      documentViewerRef.current.getAnnotationManager().drawAnnotationsFromList(documentViewerRef.current.getAnnotationManager().getAnnotationsList());
    } catch (error) {
      console.error("PDFViewerCore: Error saving annotations:", error);
    }
  };

  const loadDocument = async () => {
    if (!documentViewerRef.current || !pdfId) return;
    
    try {
      console.log("PDFViewerCore: Loading document from:", `/api/file/${pdfId}/download`);
      setLoadingError(null);
      setLoadingStatus("Loading PDF document...");
      
      await documentViewerRef.current.loadDocument(
        `/api/file/${pdfId}/download`, 
        { 
          l: process.env.NEXT_APP_PDFTRON_LICENSE_KEY,
          streaming: true,
          extension: 'pdf',
        }
      );
    } catch (err) {
      console.error("PDFViewerCore: Error loading document:", err);
      setLoadingError("Error loading PDF document. Please try again.");
      setIsLoaded(false);
      setLoadingStatus("Failed to load document");
    }
  };
  
  const checkScriptsLoaded = () => {
    const loaded = typeof window !== 'undefined' && window.Core;
    console.log('PDFViewerCore: Scripts loaded:', loaded);
    return loaded;
  };
  
  const loadScriptsManually = async () => {
    if (checkScriptsLoaded()) {
      console.log("PDFViewerCore: Core already available");
      return true;
    }
    
    setLoadingStatus("Loading PDF viewer scripts...");
    
    try {
      
      await new Promise((resolve, reject) => {
        const coreScript = document.createElement('script');
        coreScript.src = '/webviewer/core/webviewer-core.min.js';
        coreScript.async = false;
        document.body.appendChild(coreScript);
        coreScript.onload = () => {
          console.log('PDFViewerCore: Core script loaded');
          resolve(null);
        };
        coreScript.onerror = () => reject(new Error("Failed to load WebViewer Core"));
        setTimeout(() => reject(new Error("Core script load timeout")), 500);
      });
      
      
      await new Promise((resolve, reject) => {
        const pdfnetScript = document.createElement('script');
        pdfnetScript.src = '/webviewer/core/pdf/PDFNet.js';
        pdfnetScript.async = false;
        document.head.appendChild(pdfnetScript);
        pdfnetScript.onload = () => {
          console.log('PDFViewerCore: PDFNet script loaded');
          resolve(null);
        };
        pdfnetScript.onerror = () => reject(new Error("Failed to load PDFNet"));
        setTimeout(() => reject(new Error("PDFNet script load timeout")), 10000);
      });
      
      return true;
    } catch (error: any) {
      console.error("PDFViewerCore: Failed to load scripts:", error);
      setLoadingError(`Failed to load viewer scripts: ${error.message}`);
      setLoadingStatus("Script loading failed");
      return false;
    }
  };
  
  useEffect(() => {
    console.log(`PDFViewerCore: pdfId changed to ${pdfId}`);
    setIsLoaded(false);
    setLoadingError(null);
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    
    setUserRole(null);
    setUserRoleError(null);
    setIsUserRoleLoading(true);

    if (pdfId) {
      fetchUserRole(pdfId);
    }
    
    if (documentViewerRef.current) {
      try {
        documentViewerRef.current.closeDocument();
        loadDocument();
      } catch (e) {
        console.error("PDFViewerCore: Error handling document change:", e);
        hasInitializedRef.current = false;
        initAttemptedRef.current = false;
      }
    }
    
    return () => {
      console.log("PDFViewerCore: Cleaning up");
      if (documentViewerRef.current) {
        try {
          documentViewerRef.current.closeDocument();
        } catch (e) {
          console.error("PDFViewerCore: Error closing document:", e);
        }
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pdfId]);

  useEffect(() => {
    if (!isLoaded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = document.activeElement instanceof HTMLInputElement || 
                           document.activeElement instanceof HTMLTextAreaElement;
      
      if (!isInputActive) {
        if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setZoom(1.0);
        } else if (e.key === 'Escape') {
          // Press 'Escape' to return to text selection mode (default)
          e.preventDefault();
          if (window.documentViewer && window.Core?.Tools) {
            window.documentViewer.setToolMode(window.documentViewer.getTool(window.Core.Tools.ToolNames.TEXT_SELECT));
            console.log('PDFViewerCore: Returned to text selection mode via keyboard shortcut');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !viewerContainerRef.current) return;

    const viewerContainer = viewerContainerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!window.documentViewer) return;
        const currentZoom = window.documentViewer.getZoomLevel();
        let newZoom;
        if (e.deltaY < 0) {
          newZoom = Math.min(currentZoom * 1.1, MAX_ZOOM);
        } else {
          newZoom = Math.max(currentZoom * 0.9, MIN_ZOOM);
        }
        window.documentViewer.zoomTo(newZoom);
      }
    };
    
    viewerContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewerContainer.removeEventListener('wheel', handleWheel);
  }, [isLoaded]);

  async function initCore() {
    if (hasInitializedRef.current) return;
    
    console.log("PDFViewerCore: Initializing for pdfId:", pdfId);
    hasInitializedRef.current = true;
    initAttemptedRef.current = true;
    
    try {
      if (!checkScriptsLoaded()) {
        console.log("PDFViewerCore: Loading scripts manually");
        const scriptsLoaded = await loadScriptsManually();
        if (!scriptsLoaded) {
          throw new Error("Failed to load required scripts");
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!window.Core) {
        throw new Error("WebViewer Core not available");
      }
      
      const scrollElement = document.getElementById('scroll-view');
      const viewerElement = document.getElementById('viewer');
      
      if (!scrollElement || !viewerElement) {
        console.error("PDFViewerCore: Container elements missing");
        setLoadingError("PDF viewer container not found. Please refresh.");
        return;
      }
      
      setLoadingStatus("Setting up PDF viewer...");
      console.log("PDFViewerCore: Setting worker path");
      
      await window.Core.setWorkerPath('/webviewer/core');
      
      console.log("PDFViewerCore: Creating DocumentViewer");
      const documentViewer = new window.Core.DocumentViewer();
      documentViewerRef.current = documentViewer;
      annotationManagerRef.current = documentViewer.getAnnotationManager();
      
      window.documentViewer = documentViewer;
      
      annotationManagerRef.current.addEventListener('annotationChanged', (annotations: any[], action: string) => {
        console.log('PDFViewerCore: Annotation changed, action:', action);
        if (['add', 'modify', 'delete'].includes(action)) {
          if (saveTimeoutRef.current) {
            console.log('PDFViewerCore: Clearing timeout');
            clearTimeout(saveTimeoutRef.current)
          };
          saveTimeoutRef.current = setTimeout(() => {
            console.log('PDFViewerCore: Saving annotations');
            saveAnnotations()
          }, 500);
        }
      });

      documentViewer.addEventListener('documentLoaded', () => {
        console.log("PDFViewerCore: Document loaded");
        setIsLoaded(true);
        setLoadingError(null);
        setLoadingStatus("Document loaded");
        
        try {
          documentViewer.zoomTo(1.0);
          console.log("PDFViewerCore: Zoom set to 100%");
          documentViewer.enableAnnotations();
          loadAnnotations();
        } catch (err) {
          console.error("PDFViewerCore: Error setting zoom:", err);
        }
      });
      
      documentViewer.addEventListener('loaderror', (err: any) => {
        console.error("PDFViewerCore: Load error:", err);
        setLoadingError("Failed to load PDF document. File may be corrupted.");
        setIsLoaded(false);
        setLoadingStatus("Failed");
      });
      
      console.log("PDFViewerCore: Setting viewer elements");
      documentViewer.setScrollViewElement(scrollElement);
      documentViewer.setViewerElement(viewerElement);
      
      
      await loadDocument();
      
    } catch (err) {
      console.error("PDFViewerCore: Initialization error:", err);
      setLoadingError(err instanceof Error ? err.message : "Unknown error");
      setIsLoaded(false);
      hasInitializedRef.current = false;
      setLoadingStatus("Initialization failed");
    }
  }

  useEffect(() => {
    if (!initAttemptedRef.current && pdfId) {
      console.log("PDFViewerCore: Starting initialization");
      const initTimeout = setTimeout(() => {
        initCore().then(() => {
          if (pdfId) fetchUserRole(pdfId);
        }).catch(err => {
          console.error("PDFViewerCore: Init failed:", err);
          setLoadingError("Failed to initialize PDF viewer. Please refresh.");
          setLoadingStatus("Initialization failed");
        });
      }, 300);
      
      return () => clearTimeout(initTimeout);
    }
  }, [pdfId]);
  
  const handleRetry = () => {
    console.log("PDFViewerCore: Retry initiated");
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    setLoadingError(null);
    setLoadingStatus("Retrying...");
    
    if (documentViewerRef.current) {
      try {
        documentViewerRef.current.closeDocument();
      } catch (e) {
        console.error("PDFViewerCore: Error:", e);
      }
    }
    
    initCore().then(() => {
      if (pdfId) fetchUserRole(pdfId);
    });
  };

  console.log('PDFViewerCore: Render conditions:', {
    isLoaded,
    userRole,
    hasDocumentViewer: !!documentViewerRef.current,
    hasAnnotationManager: !!annotationManagerRef.current,
  });

  return (
    <>
      {isLoaded && userRole && documentViewerRef.current && annotationManagerRef.current && (
        <AnnotationPanel 
          pdfId={pdfId} 
          userRole={userRole} 
          documentViewer={documentViewerRef.current} 
          annotationManager={annotationManagerRef.current} 
        />
      )}
      <div 
        ref={viewerContainerRef}
        className="webviewer relative" 
        id="scroll-view" 
        style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          overflowY: 'auto', 
          backgroundColor: '#f0f0f0',
        }}
      >
        <div id="viewer"></div>

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center max-w-md p-6 bg-gray-50 rounded-lg shadow-lg">
              <h1 className="text-xl font-semibold mb-2">Loading PDF</h1>
              <p className="text-gray-600 mb-4">{loadingStatus}</p>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              {loadingError && (
                <div className="text-red-500 mt-4">
                  <p className="font-semibold">Error:</p>
                  <p>{loadingError}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      {isLoaded && <PDFNavigationBar />}
    </>
  );
}