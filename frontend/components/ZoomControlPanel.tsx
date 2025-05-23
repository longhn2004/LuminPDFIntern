import React, { useState, useEffect, useRef } from 'react';
import { FaSearchPlus, FaSearchMinus, FaCheck, FaStepBackward, FaStepForward, FaFastBackward, FaFastForward } from 'react-icons/fa';
import { MdOutlineTextFields } from 'react-icons/md';
import { 
  zoomIn, 
  zoomOut, 
  setZoom, 
  getCurrentZoom,
  isAtMinZoom,
  isAtMaxZoom
} from './ZoomControls';
import { ZOOM_PRESETS, MIN_ZOOM, MAX_ZOOM } from './ZoomConstants';

interface PDFNavigationBarProps {
  className?: string;
}

export default function PDFNavigationBar({ 
  className = '' 
}: PDFNavigationBarProps) {
  const [currentZoom, setCurrentZoom] = useState<number>(1.0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customZoom, setCustomZoom] = useState('');
  const [isCustomZoom, setIsCustomZoom] = useState(false);
  const [isMinZoom, setIsMinZoom] = useState(false);
  const [isMaxZoom, setIsMaxZoom] = useState(false);
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isCustomPage, setIsCustomPage] = useState(false);
  const [customPage, setCustomPage] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const customPageInputRef = useRef<HTMLInputElement>(null);
  const zoomDisplayRef = useRef<HTMLDivElement>(null);
  const pageDisplayRef = useRef<HTMLDivElement>(null);
  
  // Update zoom display and page info when component mounts or PDF viewer changes
  useEffect(() => {
    const updateZoomAndPageInfo = () => {
      // Update zoom info
      const zoom = getCurrentZoom();
      if (zoom !== null) {
        setCurrentZoom(zoom);
        setIsMinZoom(isAtMinZoom());
        setIsMaxZoom(isAtMaxZoom());
      }
      
      // Update page info
      if (window.documentViewer) {
        try {
          const page = window.documentViewer.getCurrentPage();
          const total = window.documentViewer.getPageCount();
          setCurrentPage(page);
          setTotalPages(total);
        } catch (err) {
          console.error("Error getting page info:", err);
        }
      }
    };
    
    // Initial update
    updateZoomAndPageInfo();
    
    // Set up interval to periodically check zoom level and page info
    const intervalId = setInterval(updateZoomAndPageInfo, 500);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Focus custom zoom input when custom zoom mode is enabled
  useEffect(() => {
    if (isCustomZoom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomZoom]);

  // Focus custom page input when custom page mode is enabled
  useEffect(() => {
    if (isCustomPage && customPageInputRef.current) {
      customPageInputRef.current.focus();
    }
  }, [isCustomPage]);
  
  // Handle zoom in button click
  const handleZoomIn = () => {
    if (!isMaxZoom) {
      const success = zoomIn();
      if (success) {
        const zoom = getCurrentZoom();
        if (zoom !== null) {
          setCurrentZoom(zoom);
          setIsMaxZoom(isAtMaxZoom());
          setIsMinZoom(isAtMinZoom());
        }
      }
    }
  };
  
  // Handle zoom out button click
  const handleZoomOut = () => {
    if (!isMinZoom) {
      const success = zoomOut();
      if (success) {
        const zoom = getCurrentZoom();
        if (zoom !== null) {
          setCurrentZoom(zoom);
          setIsMinZoom(isAtMinZoom());
          setIsMaxZoom(isAtMaxZoom());
        }
      }
    }
  };
  
  // Handle preset zoom click
  const handlePresetZoom = (zoom: number) => {
    setZoom(zoom);
    setIsDropdownOpen(false);
    
    setTimeout(() => {
      const currentZoom = getCurrentZoom();
      if (currentZoom !== null) {
        setCurrentZoom(currentZoom);
        setIsMinZoom(isAtMinZoom());
        setIsMaxZoom(isAtMaxZoom());
      }
    }, 100);
  };
  
  // Handle double click on zoom display
  const handleZoomDisplayDoubleClick = () => {
    if (!isCustomZoom) {
      setIsCustomZoom(true);
      setCustomZoom(Math.round(currentZoom * 100).toString());
    }
  };
  
  // Handle custom zoom input
  const handleCustomZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setCustomZoom(value);
  };
  
  // Apply custom zoom
  const applyCustomZoom = () => {
    let zoomValue = parseInt(customZoom, 10);
    
    if (isNaN(zoomValue)) {
      zoomValue = 100;
    } else if (zoomValue < MIN_ZOOM * 100) {
      zoomValue = MIN_ZOOM * 100;
    } else if (zoomValue > MAX_ZOOM * 100) {
      zoomValue = MAX_ZOOM * 100;
    }
    
    setZoom(zoomValue / 100);
    setIsCustomZoom(false);
    
    setTimeout(() => {
      const zoom = getCurrentZoom();
      if (zoom !== null) {
        setCurrentZoom(zoom);
        setIsMinZoom(isAtMinZoom());
        setIsMaxZoom(isAtMaxZoom());
      }
    }, 100);
  };
  
  // Handle key press in custom zoom input
  const handleCustomZoomKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCustomZoom();
    } else if (e.key === 'Escape') {
      setIsCustomZoom(false);
    }
  };

  // Page navigation functions
  const goToFirstPage = () => {
    if (window.documentViewer && currentPage > 1) {
      try {
        window.documentViewer.setCurrentPage(1);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error going to first page:", err);
      }
    }
  };

  const goToPreviousPage = () => {
    if (window.documentViewer && currentPage > 1) {
      try {
        const newPage = currentPage - 1;
        window.documentViewer.setCurrentPage(newPage);
        setCurrentPage(newPage);
      } catch (err) {
        console.error("Error going to previous page:", err);
      }
    }
  };

  const goToNextPage = () => {
    if (window.documentViewer && currentPage < totalPages) {
      try {
        const newPage = currentPage + 1;
        window.documentViewer.setCurrentPage(newPage);
        setCurrentPage(newPage);
      } catch (err) {
        console.error("Error going to next page:", err);
      }
    }
  };

  const goToLastPage = () => {
    if (window.documentViewer && currentPage < totalPages) {
      try {
        window.documentViewer.setCurrentPage(totalPages);
        setCurrentPage(totalPages);
      } catch (err) {
        console.error("Error going to last page:", err);
      }
    }
  };

  // Handle double click on page display
  const handlePageDisplayDoubleClick = () => {
    if (!isCustomPage) {
      setIsCustomPage(true);
      setCustomPage(currentPage.toString());
    }
  };

  // Handle custom page input
  const handleCustomPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setCustomPage(value);
  };

  // Apply custom page
  const applyCustomPage = () => {
    let pageValue = parseInt(customPage, 10);
    
    if (isNaN(pageValue)) {
      pageValue = currentPage;
    } else if (pageValue < 1) {
      pageValue = 1;
    } else if (pageValue > totalPages) {
      pageValue = totalPages;
    }
    
    if (window.documentViewer) {
      try {
        window.documentViewer.setCurrentPage(pageValue);
        setCurrentPage(pageValue);
      } catch (err) {
        console.error("Error setting page:", err);
      }
    }
    
    setIsCustomPage(false);
  };

  // Handle key press in custom page input
  const handleCustomPageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCustomPage();
    } else if (e.key === 'Escape') {
      setIsCustomPage(false);
    }
  };
  
  // Format current zoom for display
  const formattedZoom = () => {
    const matchedPreset = ZOOM_PRESETS.find(preset => Math.abs(preset.value - currentZoom) < 0.01);
    
    if (matchedPreset) {
      return matchedPreset.label;
    } else {
      return `${Math.round(currentZoom * 100)}%`;
    }
  };
  
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg ${className}`}
      ref={dropdownRef}
    >
      <div className="flex items-center justify-center px-4 py-2">
        <div className="flex items-center space-x-6">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 relative">
            <button
              onClick={handleZoomOut}
              className={`p-2 rounded-md ${isMinZoom 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={isMinZoom}
              title={isMinZoom ? "Minimum zoom reached (50%)" : "Zoom Out"}
            >
              <FaSearchMinus size={16} />
            </button>
            
            <div 
              ref={zoomDisplayRef}
              className="px-3 py-1 min-w-[80px] text-center font-medium text-gray-700 bg-gray-50 rounded border cursor-pointer relative"
              onDoubleClick={handleZoomDisplayDoubleClick}
              title="Double-click to enter custom zoom"
            >
              {isCustomZoom ? (
                <div className="flex items-center justify-center">
                  <input
                    ref={customInputRef}
                    type="text" 
                    value={customZoom}
                    onChange={handleCustomZoomChange}
                    onKeyDown={handleCustomZoomKeyPress}
                    onBlur={applyCustomZoom}
                    className="w-[50px] text-center bg-transparent focus:outline-none"
                    autoFocus
                  />
                  <span>%</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyCustomZoom();
                    }} 
                    className="ml-1 text-green-500"
                    title="Apply"
                  >
                    <FaCheck size={12} />
                  </button>
                </div>
              ) : (
                <div onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                  {formattedZoom()}
                </div>
              )}
              
              {/* Zoom dropdown positioned relative to this element */}
              {isDropdownOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="max-h-64 overflow-y-auto">
                    {ZOOM_PRESETS.map((preset) => (
                      <div 
                        key={preset.value}
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                          Math.abs(preset.value - currentZoom) < 0.01 ? 'bg-blue-50 font-medium text-blue-600' : ''
                        }`}
                        onClick={() => handlePresetZoom(preset.value)}
                      >
                        {preset.label}
                      </div>
                    ))}
                    <div 
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsCustomZoom(true);
                        setCustomZoom(Math.round(currentZoom * 100).toString());
                      }}
                    >
                      <MdOutlineTextFields className="mr-2" />
                      Custom...
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleZoomIn}
              className={`p-2 rounded-md ${isMaxZoom 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={isMaxZoom}
              title={isMaxZoom ? "Maximum zoom reached (200%)" : "Zoom In"}
            >
              <FaSearchPlus size={16} />
            </button>
          </div>

          {/* Page Navigation Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={goToFirstPage}
              className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={currentPage === 1}
              title="First Page"
            >
              &lt;&lt;
            </button>
            
            <button
              onClick={goToPreviousPage}
              className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={currentPage === 1}
              title="Previous Page"
            >
              &lt;
            </button>
            
            <div 
              ref={pageDisplayRef}
              className="px-3 py-1 text-center font-medium text-gray-700 cursor-pointer"
              onDoubleClick={handlePageDisplayDoubleClick}
              title="Double-click to go to specific page"
            >
              {isCustomPage ? (
                <div className="flex items-center">
                  <input
                    ref={customPageInputRef}
                    type="text" 
                    value={customPage}
                    onChange={handleCustomPageChange}
                    onKeyDown={handleCustomPageKeyPress}
                    onBlur={applyCustomPage}
                    className="w-[50px] text-center bg-gray-50 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="mx-1">/</span>
                  <span>{totalPages}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyCustomPage();
                    }} 
                    className="ml-2 text-green-500"
                    title="Go to page"
                  >
                    <FaCheck size={12} />
                  </button>
                </div>
              ) : (
                <span>{currentPage}/{totalPages}</span>
              )}
            </div>
            
            <button
              onClick={goToNextPage}
              className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === totalPages 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={currentPage === totalPages}
              title="Next Page"
            >
              &gt;
            </button>
            
            <button
              onClick={goToLastPage}
              className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === totalPages 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'}`}
              disabled={currentPage === totalPages}
              title="Last Page"
            >
              &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 