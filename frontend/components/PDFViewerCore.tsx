import { useEffect, useState, useRef } from 'react';
import Script from "next/script";
import PDFNavigationBar from './ZoomControlPanel';
import { zoomIn, zoomOut, setZoom } from './ZoomControls';
import { MIN_ZOOM, MAX_ZOOM } from './ZoomConstants';

interface PDFViewerCoreProps {
  pdfId: string;
}

// Define the global types
declare global {
  interface Window {
    Core: any;
    documentViewer: any;
  }
}

export default function PDFViewerCore({ pdfId }: PDFViewerCoreProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing viewer...");
  
  // Use refs to track state and instances
  const hasInitializedRef = useRef(false);
  const documentViewerRef = useRef<any>(null);
  const initAttemptedRef = useRef(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  
  // Function to load the document
  const loadDocument = async () => {
    if (!documentViewerRef.current || !pdfId) return;
    
    try {
      console.log("PDFViewerCore: Loading document from:", `/api/file/${pdfId}/download`);
      setLoadingError(null);
      setLoadingStatus("Loading PDF document...");
      
      // Load document with error handling
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
  
  // Check if scripts are already loaded in window
  const checkScriptsLoaded = () => {
    return typeof window !== 'undefined' && window.Core;
  };
  
  // Manually load scripts if needed
  const loadScriptsManually = async () => {
    if (checkScriptsLoaded()) {
      console.log("PDFViewerCore: Core already available in window");
      return true;
    }
    
    setLoadingStatus("Loading PDF viewer scripts...");
    
    try {
      // Create and append core script
      const coreScript = document.createElement('script');
      coreScript.src = '/webviewer/core/webviewer-core.min.js';
      coreScript.async = false;
      document.head.appendChild(coreScript);
      
      // Wait for core script to load
      await new Promise((resolve, reject) => {
        coreScript.onload = resolve;
        coreScript.onerror = () => reject(new Error("Failed to load WebViewer Core"));
        
        // Add timeout for script loading
        setTimeout(() => reject(new Error("Core script load timeout")), 10000);
      });
      
      console.log("PDFViewerCore: Core script loaded, loading PDFNet");
      
      // Create and append PDFNet script
      const pdfnetScript = document.createElement('script');
      pdfnetScript.src = '/webviewer/core/pdf/PDFNet.js';
      pdfnetScript.async = false;
      document.head.appendChild(pdfnetScript);
      
      // Wait for PDFNet script to load
      await new Promise((resolve, reject) => {
        pdfnetScript.onload = resolve;
        pdfnetScript.onerror = () => reject(new Error("Failed to load PDFNet"));
        
        // Add timeout for script loading
        setTimeout(() => reject(new Error("PDFNet script load timeout")), 10000);
      });
      
      console.log("PDFViewerCore: PDFNet script loaded");
      return true;
    } catch (error: any) {
      console.error("PDFViewerCore: Failed to load scripts manually", error);
      setLoadingError(`Failed to load viewer scripts: ${error.message}`);
      setLoadingStatus("Script loading failed");
      return false;
    }
  };
  
  // Reset state when pdfId changes
  useEffect(() => {
    console.log(`PDFViewerCore: pdfId changed to ${pdfId}`);
    setIsLoaded(false);
    setLoadingError(null);
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    
    // If we already have a document viewer, try to load the new document
    if (documentViewerRef.current) {
      try {
        // Close any existing document first
        documentViewerRef.current.closeDocument();
        // Then load the new one
        loadDocument();
      } catch (e) {
        console.error("Error handling document change:", e);
        hasInitializedRef.current = false;
        initAttemptedRef.current = false;
      }
    }
    
    // Return cleanup function
    return () => {
      console.log("PDFViewerCore: Cleaning up");
      
      if (documentViewerRef.current) {
        try {
          console.log("PDFViewerCore: Closing document");
          documentViewerRef.current.closeDocument();
        } catch (e) {
          console.error("Error closing document:", e);
        }
      }
    };
  }, [pdfId]);

  // Set up keyboard shortcuts for zooming
  useEffect(() => {
    if (!isLoaded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if an input element is currently focused
      const isInputActive = document.activeElement instanceof HTMLInputElement || 
                           document.activeElement instanceof HTMLTextAreaElement;
      
      // Only handle zoom shortcuts if no input is focused
      if (!isInputActive) {
        // Ctrl/Cmd + Plus key to zoom in
        if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          zoomIn();
        }
        // Ctrl/Cmd + Minus key to zoom out
        else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          zoomOut();
        }
        // Ctrl/Cmd + 0 to reset zoom to 100%
        else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setZoom(1.0);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoaded]);

  // Set up wheel event handling for zooming
  useEffect(() => {
    if (!isLoaded || !viewerContainerRef.current) return;

    const viewerContainer = viewerContainerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      // Only zoom when Ctrl/Cmd key is pressed
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Get the current zoom level
        if (!window.documentViewer) return;
        
        const currentZoom = window.documentViewer.getZoomLevel();
        
        // Calculate new zoom level
        let newZoom;
        if (e.deltaY < 0) { // Zoom in
          newZoom = Math.min(currentZoom * 1.1, MAX_ZOOM);
        } else { // Zoom out
          newZoom = Math.max(currentZoom * 0.9, MIN_ZOOM);
        }
        
        // Apply zoom
        window.documentViewer.zoomTo(newZoom);
      }
    };
    
    viewerContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      viewerContainer.removeEventListener('wheel', handleWheel);
    };
  }, [isLoaded]);

  // Main initialization function
  async function initCore() {
    if (hasInitializedRef.current) return;
    
    console.log("PDFViewerCore: Initializing PDF viewer for:", pdfId);
    hasInitializedRef.current = true;
    initAttemptedRef.current = true;
    
    try {
      // Make sure scripts are loaded
      if (!checkScriptsLoaded()) {
        console.log("PDFViewerCore: Core not found, loading scripts manually");
        const scriptsLoaded = await loadScriptsManually();
        if (!scriptsLoaded) {
          throw new Error("Failed to load required scripts");
        }
      }
      
      // Wait a moment for scripts to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check again if Core is available
      if (!window.Core) {
        throw new Error("WebViewer Core is not available after loading scripts");
      }
      
      // Ensure DOM elements exist
      const scrollElement = document.getElementById('scroll-view');
      const viewerElement = document.getElementById('viewer');
      
      if (!scrollElement || !viewerElement) {
        console.error("PDFViewerCore: Container elements not found");
        setLoadingError("PDF viewer container not found. Please refresh the page.");
        return;
      }
      
      setLoadingStatus("Setting up PDF viewer...");
      console.log("PDFViewerCore: Core object loaded, setting worker path");
      
      // Set worker path
      await window.Core.setWorkerPath('/webviewer/core');
      
      console.log("PDFViewerCore: Creating DocumentViewer");
      // Create document viewer
      const documentViewer = new window.Core.DocumentViewer();
      documentViewerRef.current = documentViewer;
      
      // Store reference to documentViewer globally for zoom controls
      window.documentViewer = documentViewer;
      
      // Set up event listeners first
      documentViewer.addEventListener('documentLoaded', () => {
        console.log("PDFViewerCore: Document loaded successfully");
        setIsLoaded(true);
        setLoadingError(null);
        setLoadingStatus("Document loaded");
        
        // Set default zoom to 100%
        try {
          documentViewer.zoomTo(1.0);
          console.log("PDFViewerCore: Set default zoom to 100%");
        } catch (err) {
          console.error("PDFViewerCore: Error setting default zoom:", err);
        }
      });
      
      documentViewer.addEventListener('loaderror', (err: any) => {
        console.error("PDFViewerCore: Error loading document:", err);
        setLoadingError("Failed to load PDF document. The file may be corrupted or protected.");
        setIsLoaded(false);
        setLoadingStatus("Document load failed");
      });
      
      // Hook up the DocumentViewer object to your own elements
      console.log("PDFViewerCore: Setting viewer elements");
      documentViewer.setScrollViewElement(scrollElement);
      documentViewer.setViewerElement(viewerElement);
      
      // Load the document after setup
      await loadDocument();
      
    } catch (err) {
      console.error("PDFViewerCore: Error initializing PDF viewer:", err);
      setLoadingError(err instanceof Error ? err.message : "Unknown error");
      setIsLoaded(false);
      hasInitializedRef.current = false;
      setLoadingStatus("Initialization failed");
    }
  }

  // Initialize on component mount or when pdfId changes
  useEffect(() => {
    if (!initAttemptedRef.current) {
      console.log("PDFViewerCore: Starting initialization");
      // Use a slight delay to ensure DOM is ready
      const initTimeout = setTimeout(() => {
        initCore().catch(err => {
          console.error("PDFViewerCore: Failed to initialize:", err);
          setLoadingError("Failed to initialize PDF viewer. Please try refreshing the page.");
          setLoadingStatus("Initialization failed");
        });
      }, 300);
      
      return () => clearTimeout(initTimeout);
    }
  }, [pdfId]);
  
  // Handle manual retry
  const handleRetry = () => {
    console.log("PDFViewerCore: Manual retry initiated");
    hasInitializedRef.current = false;
    initAttemptedRef.current = false;
    setLoadingError(null);
    setLoadingStatus("Retrying...");
    
    // Close any existing document first
    if (documentViewerRef.current) {
      try {
        documentViewerRef.current.closeDocument();
      } catch (e) {
        console.error("Error closing document during retry:", e);
      }
    }
    
    // Try initialization again
    initCore();
  };

  return (
    <>
      <div 
        ref={viewerContainerRef}
        className='webviewer relative' 
        id="scroll-view" 
        style={{ 
          height: '84vh', 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          overflowY: 'scroll', 
          backgroundColor: '#f0f0f0',
        }}
      >
        <div id="viewer" />

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

      {/* Render navigation bar outside the scroll container, but only when document is loaded */}
      {isLoaded && <PDFNavigationBar />}
    </>
  );
} 