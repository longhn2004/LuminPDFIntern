import React, { useState, useEffect, useRef } from 'react';
import { FaCheck, FaPlus, FaMinus, FaChevronDown } from 'react-icons/fa';
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

interface PageControlBarProps {
  className?: string;
}

interface ZoomControlProps {
  currentZoom: number;
  isMinZoom: boolean;
  isMaxZoom: boolean;
  isDropdownOpen: boolean;
  isCustomZoom: boolean;
  customZoom: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleDropdown: () => void;
  onDisplayDoubleClick: () => void;
  onCustomZoomChange: (value: string) => void;
  onCustomZoomKeyPress: (e: React.KeyboardEvent) => void;
  onApplyCustomZoom: () => void;
  onPresetZoom: (zoom: number) => void;
  onOpenCustomZoom: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  customInputRef: React.RefObject<HTMLInputElement | null>;
}

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  isCustomPage: boolean;
  customPage: string;
  onGoToFirstPage: () => void;
  onGoToPreviousPage: () => void;
  onGoToNextPage: () => void;
  onGoToLastPage: () => void;
  onPageDisplayDoubleClick: () => void;
  onCustomPageChange: (value: string) => void;
  onCustomPageKeyPress: (e: React.KeyboardEvent) => void;
  onApplyCustomPage: () => void;
  customPageInputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Format current zoom for display
 */
const formatZoomDisplay = (currentZoom: number): string => {
  const matchedPreset = ZOOM_PRESETS.find(preset => Math.abs(preset.value - currentZoom) < 0.01);
  return matchedPreset ? matchedPreset.label : `${Math.round(currentZoom * 100)}%`;
};

/**
 * Zoom Control Component
 */
const ZoomControl: React.FC<ZoomControlProps> = ({
  currentZoom,
  isMinZoom,
  isMaxZoom,
  isDropdownOpen,
  isCustomZoom,
  customZoom,
  onZoomIn,
  onZoomOut,
  onToggleDropdown,
  onDisplayDoubleClick,
  onCustomZoomChange,
  onCustomZoomKeyPress,
  onApplyCustomZoom,
  onPresetZoom,
  onOpenCustomZoom,
  dropdownRef,
  customInputRef
}) => {
  return (
    <div className="flex items-center space-x-1 relative">
      {/* Zoom Out Button */}
      <button
        onClick={onZoomOut}
        className={`p-2 rounded-md ${isMinZoom 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={isMinZoom}
        title={isMinZoom ? "Minimum zoom reached (50%)" : "Zoom Out"}
        aria-label="Zoom out"
      >
        <div className="w-4 h-4 rounded-full flex items-center justify-center border border-black">
          <FaMinus size={12} />
        </div>
      </button>
      
      {/* Zoom Display */}
      <div 
        ref={dropdownRef}
        className="px-3 py-1 min-w-[80px] text-center font-medium text-gray-700 bg-gray-50 rounded cursor-pointer relative hover:bg-gray-100 transition-colors"
        onDoubleClick={onDisplayDoubleClick}
        title="Click to open zoom presets, double-click for custom zoom"
      >
        {isCustomZoom ? (
          <div className="flex items-center justify-center">
            <input
              ref={customInputRef}
              type="text" 
              value={customZoom}
              onChange={(e) => onCustomZoomChange(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={onCustomZoomKeyPress}
              onBlur={onApplyCustomZoom}
              className="w-[50px] text-center bg-transparent focus:outline-none"
              autoFocus
              placeholder="100"
            />
            <span>%</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onApplyCustomZoom();
              }} 
              className="ml-1 text-green-500 hover:text-green-600"
              title="Apply"
              aria-label="Apply custom zoom"
            >
              <FaCheck size={12} />
            </button>
          </div>
        ) : (
          <div onClick={onToggleDropdown} className="flex items-center justify-center">
            <span>{formatZoomDisplay(currentZoom)}</span>
            {/* TODO: Add a down arrow icon here */}
            <span className="ml-1 text-xs text-gray-400"><FaChevronDown /></span>
          </div>
        )}
        
        {/* Zoom Dropdown */}
        {isDropdownOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-20 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
            <div className="py-1">
              {ZOOM_PRESETS.map((preset) => (
                <div 
                  key={preset.value}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors text-sm ${
                    Math.abs(preset.value - currentZoom) < 0.01 ? 'bg-gray-200 font-medium text-gray-800' : 'text-gray-700'
                  }`}
                  onClick={() => onPresetZoom(preset.value)}
                >
                  {preset.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Zoom In Button */}
      <button
        onClick={onZoomIn}
        className={`p-2 rounded-md ${isMaxZoom 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={isMaxZoom}
        title={isMaxZoom ? "Maximum zoom reached (200%)" : "Zoom In"}
        aria-label="Zoom in"
      >
        <div className="w-4 h-4 rounded-full flex items-center justify-center border border-black">
          <FaPlus size={12} />
        </div>
      </button>
    </div>
  );
};

/**
 * Page Navigation Component
 */
const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  isCustomPage,
  customPage,
  onGoToFirstPage,
  onGoToPreviousPage,
  onGoToNextPage,
  onGoToLastPage,
  onPageDisplayDoubleClick,
  onCustomPageChange,
  onCustomPageKeyPress,
  onApplyCustomPage,
  customPageInputRef
}) => {
  return (
    <div className="flex items-center space-x-1">
      {/* First Page */}
      <button
        onClick={onGoToFirstPage}
        className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === 1 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={currentPage === 1}
        title="First Page"
        aria-label="Go to first page"
      >
        &lt;&lt;
      </button>
      
      {/* Previous Page */}
      <button
        onClick={onGoToPreviousPage}
        className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === 1 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={currentPage === 1}
        title="Previous Page"
        aria-label="Go to previous page"
      >
        &lt;
      </button>
      
      {/* Page Display */}
      <div 
        className="px-3 py-1 text-center font-medium text-gray-700 cursor-pointer"
        onDoubleClick={onPageDisplayDoubleClick}
        title="Double-click to go to specific page"
      >
        {isCustomPage ? (
          <div className="flex items-center">
            <input
              ref={customPageInputRef}
              type="text" 
              value={customPage}
              onChange={(e) => onCustomPageChange(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={onCustomPageKeyPress}
              onBlur={onApplyCustomPage}
              className="w-[50px] text-center bg-gray-50 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <span className="mx-1">/</span>
            <span>{totalPages}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onApplyCustomPage();
              }} 
              className="ml-2 text-green-500"
              title="Go to page"
              aria-label="Go to specified page"
            >
              <FaCheck size={12} />
            </button>
          </div>
        ) : (
          <span>{currentPage}/{totalPages}</span>
        )}
      </div>
      
      {/* Next Page */}
      <button
        onClick={onGoToNextPage}
        className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === totalPages 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={currentPage === totalPages}
        title="Next Page"
        aria-label="Go to next page"
      >
        &gt;
      </button>
      
      {/* Last Page */}
      <button
        onClick={onGoToLastPage}
        className={`px-2 py-1 rounded-md text-sm font-medium ${currentPage === totalPages 
          ? 'text-gray-300 cursor-not-allowed' 
          : 'hover:bg-gray-100 text-gray-600'}`}
        disabled={currentPage === totalPages}
        title="Last Page"
        aria-label="Go to last page"
      >
        &gt;&gt;
      </button>
    </div>
  );
};

/**
 * Custom hook for zoom management
 */
const useZoomControl = () => {
  const [currentZoom, setCurrentZoom] = useState<number>(1.0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customZoom, setCustomZoom] = useState('');
  const [isCustomZoom, setIsCustomZoom] = useState(false);
  const [isMinZoom, setIsMinZoom] = useState(false);
  const [isMaxZoom, setIsMaxZoom] = useState(false);

  const updateZoomState = () => {
    const zoom = getCurrentZoom();
    if (zoom !== null) {
      setCurrentZoom(zoom);
      setIsMinZoom(isAtMinZoom());
      setIsMaxZoom(isAtMaxZoom());
    }
  };

  const handleZoomIn = () => {
    if (!isMaxZoom && zoomIn()) {
      updateZoomState();
    }
  };

  const handleZoomOut = () => {
    if (!isMinZoom && zoomOut()) {
      updateZoomState();
    }
  };

  const handlePresetZoom = (zoom: number) => {
    setZoom(zoom);
    setIsDropdownOpen(false);
    setTimeout(updateZoomState, 100);
  };

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
    setTimeout(updateZoomState, 100);
  };

  const handleCustomZoomKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCustomZoom();
    } else if (e.key === 'Escape') {
      setIsCustomZoom(false);
    }
  };

  return {
    currentZoom,
    isDropdownOpen,
    setIsDropdownOpen,
    customZoom,
    setCustomZoom,
    isCustomZoom,
    setIsCustomZoom,
    isMinZoom,
    isMaxZoom,
    handleZoomIn,
    handleZoomOut,
    handlePresetZoom,
    applyCustomZoom,
    handleCustomZoomKeyPress,
    updateZoomState
  };
};

/**
 * Custom hook for page navigation
 */
const usePageNavigation = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isCustomPage, setIsCustomPage] = useState(false);
  const [customPage, setCustomPage] = useState('');

  const updatePageState = () => {
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

  const handleCustomPageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyCustomPage();
    } else if (e.key === 'Escape') {
      setIsCustomPage(false);
    }
  };

  return {
    currentPage,
    totalPages,
    isCustomPage,
    setIsCustomPage,
    customPage,
    setCustomPage,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    applyCustomPage,
    handleCustomPageKeyPress,
    updatePageState
  };
};

/**
 * Main Page Control Bar Component
 */
export default function PageControlBar({ className = '' }: PageControlBarProps) {
  const zoomControl = useZoomControl();
  const pageNavigation = usePageNavigation();
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const customPageInputRef = useRef<HTMLInputElement | null>(null);
  
  // Update zoom and page info
  useEffect(() => {
    const updateInfo = () => {
      zoomControl.updateZoomState();
      pageNavigation.updatePageState();
    };
    
    updateInfo();
    const intervalId = setInterval(updateInfo, 500);
    return () => clearInterval(intervalId);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        zoomControl.setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Focus inputs when custom mode is enabled
  useEffect(() => {
    if (zoomControl.isCustomZoom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [zoomControl.isCustomZoom]);

  useEffect(() => {
    if (pageNavigation.isCustomPage && customPageInputRef.current) {
      customPageInputRef.current.focus();
    }
  }, [pageNavigation.isCustomPage]);

  return (
    <div 
      className={`bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg ${className}`}
    >
      <div className="flex items-center justify-center px-4 py-2">
        <div className="flex items-center space-x-6">
          
          {/* Zoom Controls */}
          <ZoomControl
            currentZoom={zoomControl.currentZoom}
            isMinZoom={zoomControl.isMinZoom}
            isMaxZoom={zoomControl.isMaxZoom}
            isDropdownOpen={zoomControl.isDropdownOpen}
            isCustomZoom={zoomControl.isCustomZoom}
            customZoom={zoomControl.customZoom}
            onZoomIn={zoomControl.handleZoomIn}
            onZoomOut={zoomControl.handleZoomOut}
            onToggleDropdown={() => zoomControl.setIsDropdownOpen(!zoomControl.isDropdownOpen)}
            onDisplayDoubleClick={() => {
              if (!zoomControl.isCustomZoom) {
                zoomControl.setIsCustomZoom(true);
                zoomControl.setCustomZoom(Math.round(zoomControl.currentZoom * 100).toString());
              }
            }}
            onCustomZoomChange={zoomControl.setCustomZoom}
            onCustomZoomKeyPress={zoomControl.handleCustomZoomKeyPress}
            onApplyCustomZoom={zoomControl.applyCustomZoom}
            onPresetZoom={zoomControl.handlePresetZoom}
            onOpenCustomZoom={() => {
              zoomControl.setIsDropdownOpen(false);
              zoomControl.setIsCustomZoom(true);
              zoomControl.setCustomZoom(Math.round(zoomControl.currentZoom * 100).toString());
            }}
            dropdownRef={dropdownRef}
            customInputRef={customInputRef}
          />

          {/* Page Navigation Controls */}
          <PageNavigation
            currentPage={pageNavigation.currentPage}
            totalPages={pageNavigation.totalPages}
            isCustomPage={pageNavigation.isCustomPage}
            customPage={pageNavigation.customPage}
            onGoToFirstPage={pageNavigation.goToFirstPage}
            onGoToPreviousPage={pageNavigation.goToPreviousPage}
            onGoToNextPage={pageNavigation.goToNextPage}
            onGoToLastPage={pageNavigation.goToLastPage}
            onPageDisplayDoubleClick={() => {
              if (!pageNavigation.isCustomPage) {
                pageNavigation.setIsCustomPage(true);
                pageNavigation.setCustomPage(pageNavigation.currentPage.toString());
              }
            }}
            onCustomPageChange={pageNavigation.setCustomPage}
            onCustomPageKeyPress={pageNavigation.handleCustomPageKeyPress}
            onApplyCustomPage={pageNavigation.applyCustomPage}
            customPageInputRef={customPageInputRef}
          />
        </div>
      </div>
    </div>
  );
} 