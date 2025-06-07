import { useEffect, useState, useRef } from 'react';
import PDFNavigationBar from '../viewpdf/PageControlBar';
import AnnotationPanel from './SharedAnnotationPanel';
import { zoomIn, zoomOut, setZoom } from '../viewpdf/ZoomControls';
import { MIN_ZOOM, MAX_ZOOM } from '../viewpdf/ZoomConstants';
import { useAppTranslations } from '@/hooks/useTranslations';

interface SharedPDFViewerCoreProps {
  token: string; // Shareable link token
  fileId: string; // Actual file ID from access validation
  userRole: 'viewer' | 'editor';
  isSharedView: boolean;
}

export default function SharedPDFViewerCore({ 
  token: shareToken, 
  fileId, 
  userRole, 
  isSharedView 
}: SharedPDFViewerCoreProps) {
  const translations = useAppTranslations();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingStatusKey, setLoadingStatusKey] = useState<string>("initializingSharedViewer");

  const hasInitializedRef = useRef(false);
  const documentViewerRef = useRef<any>(null);
  const annotationManagerRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  const currentVersionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to get translated loading status
  const getLoadingStatus = (statusKey: string) => {
    const statusMap: { [key: string]: string } = {
      'initializingSharedViewer': translations.share("initializingSharedViewer"),
      'loadingSharedPDFDocument': translations.share("loadingSharedPDFDocument"),
      'loadingPDFViewerScripts': translations.viewer("loadingPDFViewerScripts"),
      'settingUpSharedPDFViewer': translations.share("settingUpSharedPDFViewer"),
      'sharedDocumentLoaded': translations.share("sharedDocumentLoaded"),
      'failed': translations.viewer("failed"),
      'scriptLoadingFailed': translations.viewer("scriptLoadingFailed"),
      'initializationFailed': translations.share("initializationFailed"),
      'retrying': translations.share("retrying"),
    };
    return statusMap[statusKey] || statusKey;
  };

  // Function to get translated error message
  const getErrorMessage = (errorKey: string | null) => {
    if (!errorKey) return null;
    
    const errorMap: { [key: string]: string } = {
      'errorLoadingSharedPDFDocument': translations.share("errorLoadingSharedPDFDocument"),
      'failedToLoadSharedDocument': translations.share("failedToLoadSharedDocument"),
      'pdfViewerContainerNotFound': translations.viewer("pdfViewerContainerNotFound"),
      'failedToLoadViewerScripts': translations.viewer("failedToLoadViewerScripts"),
    };
    
    // If it's a key we recognize, translate it; otherwise return as-is (for dynamic errors)
    return errorMap[errorKey] || errorKey;
  };

  const loadAnnotations = async () => {
    if (!fileId || !annotationManagerRef.current) {
      console.log("SharedPDFViewerCore: Skipping annotation loading", { fileId, hasAnnotationManager: !!annotationManagerRef.current });
      return;
    }
    
    try {
      console.log(`SharedPDFViewerCore: Loading annotations for shared fileId=${fileId}`);
      
      // Use token-based annotation endpoint
      const url = shareToken 
        ? `/api/file/${fileId}/annotation?token=${shareToken}`
        : `/api/file/${fileId}/annotation`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load annotations: ${response.statusText}`);
      }
      
      const { xfdf, version } = await response.json();
      currentVersionRef.current = version || 0;
      if (xfdf) {
        await annotationManagerRef.current.importAnnotations(xfdf);
        console.log('SharedPDFViewerCore: Annotations imported');
        annotationManagerRef.current.drawAnnotationsFromList(annotationManagerRef.current.getAnnotationsList());
        console.log("SharedPDFViewerCore: Annotations loaded and drawn, version:", currentVersionRef.current);
      } else {
        console.log("SharedPDFViewerCore: No annotations found");
      }
    } catch (error) {
      console.error("SharedPDFViewerCore: Error loading annotations:", error);
    }
  };

  const saveAnnotations = async () => {
    if (userRole !== 'editor') {
      console.log("SharedPDFViewerCore: Cannot save annotations, userRole:", userRole);
      return;
    }
    
    try {
      console.log(`SharedPDFViewerCore: Saving annotations for shared fileId=${fileId}`);
      const xfdf = await annotationManagerRef.current.exportAnnotations();
      
      const url = shareToken 
        ? `/api/file/${fileId}/annotation/save?token=${shareToken}`
        : `/api/file/${fileId}/annotation/save`;
        
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ xfdf }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          alert(translations.share("conflictDetected"));
          return;
        }
        throw new Error(`Failed to save annotations: ${response.statusText}`);
      }
      
      const { version, responsexfdf } = await response.json();
      currentVersionRef.current = version;
      console.log("SharedPDFViewerCore: Annotations saved, version:", currentVersionRef.current);
      
      await documentViewerRef.current.getAnnotationManager().importAnnotations(responsexfdf);
      documentViewerRef.current.getAnnotationManager().drawAnnotationsFromList(
        documentViewerRef.current.getAnnotationManager().getAnnotationsList()
      );
    } catch (error) {
      console.error("SharedPDFViewerCore: Error saving annotations:", error);
    }
  };

  const loadDocument = async () => {
    if (!documentViewerRef.current || !fileId) return;
    
    try {
      console.log("SharedPDFViewerCore: Loading shared document from:", `/api/file/${fileId}/download?token=${shareToken}`);
      setLoadingError(null);
      setLoadingStatusKey("loadingSharedPDFDocument");
      
      // Use token-based download URL for shared access
      const downloadUrl = shareToken 
        ? `/api/file/${fileId}/download?token=${shareToken}`
        : `/api/file/${fileId}/download`;
      
      await documentViewerRef.current.loadDocument(
        downloadUrl, 
        { 
          l: process.env.NEXT_APP_PDFTRON_LICENSE_KEY,
          streaming: true,
          extension: 'pdf',
        }
      );
    } catch (err) {
      console.error("SharedPDFViewerCore: Error loading shared document:", err);
      setLoadingError("errorLoadingSharedPDFDocument");
      setIsLoaded(false);
      setLoadingStatusKey("failed");
    }
  };
  
  const checkScriptsLoaded = () => {
    const loaded = typeof window !== 'undefined' && window.Core;
    console.log('SharedPDFViewerCore: Scripts loaded:', loaded);
    return loaded;
  };
  
  const loadScriptsManually = async () => {
    if (checkScriptsLoaded()) {
      console.log("SharedPDFViewerCore: Core already available");
      return true;
    }
    
    setLoadingStatusKey("loadingPDFViewerScripts");
    
    try {
      await new Promise((resolve, reject) => {
        const coreScript = document.createElement('script');
        coreScript.src = '/webviewer/core/webviewer-core.min.js';
        coreScript.async = false;
        document.body.appendChild(coreScript);
        coreScript.onload = () => {
          console.log('SharedPDFViewerCore: Core script loaded');
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
          console.log('SharedPDFViewerCore: PDFNet script loaded');
          resolve(null);
        };
        pdfnetScript.onerror = () => reject(new Error("Failed to load PDFNet"));
        setTimeout(() => reject(new Error("PDFNet script load timeout")), 10000);
      });
      
      return true;
    } catch (error: any) {
      console.error("SharedPDFViewerCore: Failed to load scripts:", error);
      setLoadingError(`${translations.viewer("failedToLoadViewerScripts")}: ${error.message}`);
      setLoadingStatusKey("scriptLoadingFailed");
      return false;
    }
  };
  
  useEffect(() => {
    console.log(`SharedPDFViewerCore: Props changed - fileId: ${fileId}, userRole: ${userRole}, shareToken: ${!!shareToken}`);
    setIsLoaded(false);
    setLoadingError(null);
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    
    if (documentViewerRef.current) {
      try {
        documentViewerRef.current.closeDocument();
        loadDocument();
      } catch (e) {
        console.error("SharedPDFViewerCore: Error handling document change:", e);
        hasInitializedRef.current = false;
        initAttemptedRef.current = false;
      }
    }
    
    return () => {
      console.log("SharedPDFViewerCore: Cleaning up");
      if (documentViewerRef.current) {
        try {
          documentViewerRef.current.closeDocument();
        } catch (e) {
          console.error("SharedPDFViewerCore: Error closing document:", e);
        }
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fileId, shareToken, userRole]);

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
          e.preventDefault();
          if (window.documentViewer && window.Core?.Tools) {
            window.documentViewer.setToolMode(window.documentViewer.getTool(window.Core.Tools.ToolNames.TEXT_SELECT));
            console.log('SharedPDFViewerCore: Returned to text selection mode via keyboard shortcut');
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
    
    console.log("SharedPDFViewerCore: Initializing for shared access - fileId:", fileId);
    hasInitializedRef.current = true;
    initAttemptedRef.current = true;
    
    try {
      if (!checkScriptsLoaded()) {
        console.log("SharedPDFViewerCore: Loading scripts manually");
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
        console.error("SharedPDFViewerCore: Container elements missing");
        setLoadingError("pdfViewerContainerNotFound");
        return;
      }
      
      setLoadingStatusKey("settingUpSharedPDFViewer");
      console.log("SharedPDFViewerCore: Setting worker path");
      
      await window.Core.setWorkerPath('/webviewer/core');
      
      console.log("SharedPDFViewerCore: Creating DocumentViewer for shared access");
      const documentViewer = new window.Core.DocumentViewer();
      documentViewerRef.current = documentViewer;
      annotationManagerRef.current = documentViewer.getAnnotationManager();
      
      window.documentViewer = documentViewer;
      
      // Only set up annotation change listeners for editors
      if (userRole === 'editor') {
        annotationManagerRef.current.addEventListener('annotationChanged', (annotations: any[], action: string) => {
          console.log('SharedPDFViewerCore: Annotation changed, action:', action);
          if (['add', 'modify', 'delete'].includes(action)) {
            if (saveTimeoutRef.current) {
              console.log('SharedPDFViewerCore: Clearing timeout');
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              console.log('SharedPDFViewerCore: Saving annotations');
              saveAnnotations();
            }, 500);
          }
        });
      }

      documentViewer.addEventListener('documentLoaded', () => {
        console.log("SharedPDFViewerCore: Shared document loaded");
        setIsLoaded(true);
        setLoadingError(null);
        setLoadingStatusKey("sharedDocumentLoaded");
        
        try {
          documentViewer.zoomTo(1.0);
          console.log("SharedPDFViewerCore: Zoom set to 100%");
          documentViewer.enableAnnotations();
          loadAnnotations();
        } catch (err) {
          console.error("SharedPDFViewerCore: Error setting zoom:", err);
        }
      });
      
      documentViewer.addEventListener('loaderror', (err: any) => {
        console.error("SharedPDFViewerCore: Load error:", err);
        setLoadingError("failedToLoadSharedDocument");
        setIsLoaded(false);
        setLoadingStatusKey("failed");
      });
      
      console.log("SharedPDFViewerCore: Setting viewer elements");
      documentViewer.setScrollViewElement(scrollElement);
      documentViewer.setViewerElement(viewerElement);
      
      await loadDocument();
      
    } catch (err) {
      console.error("SharedPDFViewerCore: Initialization error:", err);
      setLoadingError(err instanceof Error ? err.message : "Unknown error");
      setIsLoaded(false);
      hasInitializedRef.current = false;
      setLoadingStatusKey("initializationFailed");
    }
  }

  useEffect(() => {
    if (!initAttemptedRef.current && fileId) {
      console.log("SharedPDFViewerCore: Starting shared access initialization");
      const initTimeout = setTimeout(() => {
        initCore().catch(err => {
          console.error("SharedPDFViewerCore: Init failed:", err);
          setLoadingError(translations.share("failedToInitializeSharedPDFViewer"));
          setLoadingStatusKey("initializationFailed");
        });
      }, 300);
      
      return () => clearTimeout(initTimeout);
    }
  }, [fileId]);
  
  const handleRetry = () => {
    console.log("SharedPDFViewerCore: Retry initiated");
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    setLoadingError(null);
    setLoadingStatusKey("retrying");
    
    if (documentViewerRef.current) {
      try {
        documentViewerRef.current.closeDocument();
      } catch (e) {
        console.error("SharedPDFViewerCore: Error:", e);
      }
    }
    
    initCore();
  };

  console.log('SharedPDFViewerCore: Render conditions:', {
    isLoaded,
    userRole,
    isSharedView,
    hasDocumentViewer: !!documentViewerRef.current,
    hasAnnotationManager: !!annotationManagerRef.current,
  });

  return (
    <>
      {isLoaded && documentViewerRef.current && annotationManagerRef.current && (
        <AnnotationPanel 
          pdfId={fileId}
          userRole={userRole} 
          isSharedView={isSharedView}
          shareToken={shareToken}
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
              <h1 className="text-xl font-semibold mb-2">{translations.share("loadingSharedPDF")}</h1>
              <p className="text-gray-600 mb-4">{getLoadingStatus(loadingStatusKey)}</p>
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              {loadingError && (
                <div className="text-red-500 mt-4">
                  <p className="font-semibold">{translations.viewer("errorLabel")}</p>
                  <p>{getErrorMessage(loadingError)}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    {translations.common("retry")}
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