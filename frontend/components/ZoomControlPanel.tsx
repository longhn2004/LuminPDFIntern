import React, { useState, useEffect, useRef } from 'react';
import { FaSearchPlus, FaSearchMinus, FaCheck } from 'react-icons/fa';
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

interface ZoomControlPanelProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  className?: string;
}

export default function ZoomControlPanel({ 
  position = 'bottom-center', 
  className = '' 
}: ZoomControlPanelProps) {
  const [currentZoom, setCurrentZoom] = useState<number>(1.0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customZoom, setCustomZoom] = useState('');
  const [isCustomZoom, setIsCustomZoom] = useState(false);
  const [isMinZoom, setIsMinZoom] = useState(false);
  const [isMaxZoom, setIsMaxZoom] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const zoomDisplayRef = useRef<HTMLDivElement>(null);
  
  // Position styles for fixed positioning
  const positionStyles = {
    'top-left': 'top-20 left-4',
    'top-right': 'top-20 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };
  
  // Update zoom display when component mounts or PDF viewer changes
  useEffect(() => {
    const updateZoomLevel = () => {
      const zoom = getCurrentZoom();
      if (zoom !== null) {
        setCurrentZoom(zoom);
        setIsMinZoom(isAtMinZoom());
        setIsMaxZoom(isAtMaxZoom());
      }
    };
    
    // Initial update
    updateZoomLevel();
    
    // Set up interval to periodically check zoom level
    const intervalId = setInterval(updateZoomLevel, 500);
    
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

  // Set up mouse wheel event listener for the document
  useEffect(() => {
    // Add PDFTron mouse wheel handler
    if (window.documentViewer) {
      // This is a simplification - PDFTron's WebViewer should handle
      // wheel events on the document properly by default
      console.log("PDF viewer is loaded, wheel events should be handled natively");
    }
  }, []);
  
  // Handle zoom in button click
  const handleZoomIn = () => {
    if (!isMaxZoom) {
      const success = zoomIn();
      if (success) {
        // Will be updated by the interval, but update immediately for better UX
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
        // Will be updated by the interval, but update immediately for better UX
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
    
    // Update immediately for better UX
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
    // Allow only numbers and backspace
    const value = e.target.value.replace(/[^\d]/g, '');
    setCustomZoom(value);
  };
  
  // Apply custom zoom
  const applyCustomZoom = () => {
    let zoomValue = parseInt(customZoom, 10);
    
    // Apply min/max constraints
    if (isNaN(zoomValue)) {
      zoomValue = 100;
    } else if (zoomValue < MIN_ZOOM * 100) {
      zoomValue = MIN_ZOOM * 100;
    } else if (zoomValue > MAX_ZOOM * 100) {
      zoomValue = MAX_ZOOM * 100;
    }
    
    // Set zoom
    setZoom(zoomValue / 100);
    setIsCustomZoom(false);
    
    // Update immediately for better UX
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
  
  // Format current zoom for display
  const formattedZoom = () => {
    const matchedPreset = ZOOM_PRESETS.find(preset => Math.abs(preset.value - currentZoom) < 0.01);
    
    if (matchedPreset) {
      return matchedPreset.label;
    } else {
      return `${Math.round(currentZoom * 100)}%`;
    }
  };
  
  // For centered position, we need special handling for the dropdown
  const dropdownPosition = position === 'bottom-center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
  
  return (
    <div 
      className={`fixed ${positionStyles[position]} z-50 ${className}`}
      ref={dropdownRef}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Main zoom controls */}
        <div className="flex items-center p-1">
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
            className="px-2 min-w-[65px] text-center font-medium text-gray-700"
            onDoubleClick={handleZoomDisplayDoubleClick}
            title="Double-click to enter custom zoom"
            style={{ cursor: 'pointer' }}
          >
            {isCustomZoom ? (
              <div className="flex items-center">
                <input
                  ref={customInputRef}
                  type="text" 
                  value={customZoom}
                  onChange={handleCustomZoomChange}
                  onKeyDown={handleCustomZoomKeyPress}
                  onBlur={applyCustomZoom}
                  className="w-[40px] text-center focus:outline-none"
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
        
        {/* Zoom dropdown */}
        {isDropdownOpen && (
          <div className={`absolute bottom-full mb-1 w-full ${dropdownPosition} bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden`}>
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
    </div>
  );
} 