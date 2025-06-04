'use client';

import React, { useState, useEffect } from 'react';

interface SharedAnnotationPanelProps {
  pdfId: string;
  annotationManager: any;
  documentViewer: any;
  userRole: string;
  isSharedView: boolean;
  shareToken: string | null;
}

const SharedAnnotationPanel: React.FC<SharedAnnotationPanelProps> = ({
  pdfId,
  annotationManager,
  documentViewer,
  userRole,
  isSharedView,
  shareToken,
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string>('rectangle');
  const [styleMode, setStyleMode] = useState<'fill' | 'stroke'>('fill');
  const [opacity, setOpacity] = useState<number>(50);
  const [borderWeight, setBorderWeight] = useState<number>(1);
  const [annotationPosition, setAnnotationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>('pan');
  const [trackingPosition, setTrackingPosition] = useState(false);

  useEffect(() => {
    console.log('SharedAnnotationPanel: Mounted with props:', { 
      pdfId, 
      userRole, 
      isSharedView, 
      hasShareToken: !!shareToken,
      hasAnnotationManager: !!annotationManager, 
      hasDocumentViewer: !!documentViewer 
    });
  }, []);

  const Annotations = window.Core?.Annotations;
  const Tools = window.Core?.Tools;

  if (!Annotations || !Tools) {
    console.error('SharedAnnotationPanel: window.Core.Annotations or window.Core.Tools is not available');
    return null;
  }

  // Check if user has editing permissions
  const canEdit = userRole === 'editor' && isSharedView;
  const isViewer = userRole === 'viewer' || !canEdit;

  // Function to update annotation position
  const updateAnnotationPosition = (annotation: any) => {
    if (!annotation) {
      setAnnotationPosition(null);
      return;
    }

    try {
      const rect = annotation.getRect();
      if (rect && documentViewer) {
        const zoom = documentViewer.getZoomLevel();
        const scrollElement = document.getElementById('scroll-view');
        
        if (scrollElement) {
          const scrollRect = scrollElement.getBoundingClientRect();
          const scrollTop = scrollElement.scrollTop;
          const scrollLeft = scrollElement.scrollLeft;
          
          const x = (rect.x1 * zoom) - scrollLeft + scrollRect.left;
          const y = (rect.y1 * zoom) - scrollTop + scrollRect.top;
          
          setAnnotationPosition({ x, y });
          console.log('SharedAnnotationPanel: Position updated:', { x, y, zoom, rect });
        }
      }
    } catch (error) {
      console.error('SharedAnnotationPanel: Error getting annotation position:', error);
      setAnnotationPosition(null);
    }
  };

  useEffect(() => {
    const handleSelection = () => {
      const selected = annotationManager.getSelectedAnnotations();
      const annotation = selected.length === 1 ? selected[0] : null;
      setSelectedAnnotation(annotation);
      
      // Only show style panel if user has edit permissions
      setShowStylePanel(selected.length === 1 && canEdit);
      
      if (annotation) {
        setOpacity(Math.round((annotation.Opacity || 1) * 100));
        
        if (annotation.elementName === 'freetext') {
          setBorderWeight(annotation.StrokeThickness || 0);
        } else {
          setBorderWeight(annotation.StrokeThickness || 1);
        }
        
        updateAnnotationPosition(annotation);
        setTrackingPosition(true);
      } else {
        setAnnotationPosition(null);
        setTrackingPosition(false);
      }
      
      console.log('SharedAnnotationPanel: Annotation selected:', selected.length > 0 ? selected[0] : 'None');
    };
    
    annotationManager.addEventListener('annotationSelected', handleSelection);
    return () => {
      annotationManager.removeEventListener('annotationSelected', handleSelection);
    };
  }, [annotationManager, documentViewer, canEdit]);

  // Track position changes when annotation is selected
  useEffect(() => {
    if (!trackingPosition || !selectedAnnotation || !documentViewer) return;

    const updatePosition = () => {
      updateAnnotationPosition(selectedAnnotation);
    };

    const handleZoomUpdated = () => {
      updatePosition();
    };

    const scrollElement = document.getElementById('scroll-view');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', updatePosition);
    }

    documentViewer.addEventListener('zoomUpdated', handleZoomUpdated);

    const handleAnnotationChanged = (annotations: any[], action: string) => {
      if (action === 'modify' && annotations.includes(selectedAnnotation)) {
        updatePosition();
      }
    };
    annotationManager.addEventListener('annotationChanged', handleAnnotationChanged);

    const positionUpdateInterval = setInterval(updatePosition, 16);

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', updatePosition);
      }
      documentViewer.removeEventListener('zoomUpdated', handleZoomUpdated);
      annotationManager.removeEventListener('annotationChanged', handleAnnotationChanged);
      clearInterval(positionUpdateInterval);
    };
  }, [trackingPosition, selectedAnnotation, documentViewer, annotationManager]);

  // Enable text selection mode by default
  useEffect(() => {
    if (documentViewer && Tools) {
      documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
      setCurrentTool('TextSelect');
      
      const handleToolModeChange = (newTool: any, oldTool: any) => {
        const toolName = newTool.name || 'unknown';
        setCurrentTool(toolName);
        console.log('SharedAnnotationPanel: Tool changed to:', toolName);
      };
      
      documentViewer.addEventListener('toolModeUpdated', handleToolModeChange);
      
      return () => {
        documentViewer.removeEventListener('toolModeUpdated', handleToolModeChange);
      };
    }
  }, [documentViewer, Tools]);

  // Load annotations for shared access
  const loadAnnotations = async () => {
    if (!pdfId || !annotationManager) {
      console.log('SharedAnnotationPanel: Skipping annotation loading', { pdfId, hasAnnotationManager: !!annotationManager });
      return;
    }
    
    try {
      console.log(`SharedAnnotationPanel: Loading annotations for shared pdfId=${pdfId}`);
      
      // Use token-based annotation endpoint for shared access
      const url = shareToken 
        ? `/api/file/${pdfId}/annotation?token=${shareToken}`
        : `/api/file/${pdfId}/annotation`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load annotations: ${response.statusText}`);
      }
      
      const { xfdf } = await response.json();
      if (xfdf) {
        await annotationManager.importAnnotations(xfdf);
        console.log('SharedAnnotationPanel: Annotations imported');
        annotationManager.drawAnnotationsFromList(annotationManager.getAnnotationsList());
        console.log("SharedAnnotationPanel: Annotations loaded and drawn");
      } else {
        console.log("SharedAnnotationPanel: No annotations found");
      }
    } catch (error) {
      console.error("SharedAnnotationPanel: Error loading annotations:", error);
    }
  };

  // Save annotations (only for editors)
  const saveAnnotations = async () => {
    if (!canEdit) {
      console.log("SharedAnnotationPanel: Cannot save annotations, insufficient permissions");
      return;
    }
    
    try {
      console.log(`SharedAnnotationPanel: Saving annotations for shared pdfId=${pdfId}`);
      const xfdf = await annotationManager.exportAnnotations();
      
      const url = shareToken 
        ? `/api/file/${pdfId}/annotation/save?token=${shareToken}`
        : `/api/file/${pdfId}/annotation/save`;
        
      const response = await fetch(url, {
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
      console.log("SharedAnnotationPanel: Annotations saved, version:", version);
      
      await documentViewer.getAnnotationManager().importAnnotations(responsexfdf);
      documentViewer.getAnnotationManager().drawAnnotationsFromList(
        documentViewer.getAnnotationManager().getAnnotationsList()
      );
    } catch (error) {
      console.error("SharedAnnotationPanel: Error saving annotations:", error);
    }
  };

  // Load annotations when component mounts
  useEffect(() => {
    if (annotationManager && documentViewer) {
      // Wait a bit for the document to be fully loaded
      const loadTimeout = setTimeout(() => {
        loadAnnotations();
      }, 1000);
      
      return () => clearTimeout(loadTimeout);
    }
  }, [annotationManager, documentViewer, pdfId, shareToken]);

  // For viewers, only show read-only message
  if (isViewer) {
    return null; // Don't show anything for viewers - they just get read-only PDF access
  }

  // Rest of the component is same as AnnotationPanel but only shows for editors
  // Shape options
  const shapeOptions = [
    { value: 'rectangle', label: 'Rectangle', icon: '▭' },
    { value: 'circle', label: 'Circle', icon: '○' },
    { value: 'triangle', label: 'Triangle', icon: '△' },
    { value: 'line', label: 'Line', icon: '/' },
    { value: 'arrow', label: 'Arrow', icon: '↗' },
  ];

  // Color palette - updated for black-grey-white theme
  const colorPalette = [
    { color: 'transparent', label: 'No Fill', isTransparent: true },
    { color: '#000000', label: 'Black' },
    { color: '#374151', label: 'Dark Grey' },
    { color: '#6B7280', label: 'Medium Grey' },
    { color: '#9CA3AF', label: 'Light Grey' },
    { color: '#D1D5DB', label: 'Very Light Grey' },
    { color: '#F3F4F6', label: 'Off White' },
    { color: '#FFFFFF', label: 'White' },
  ];

  // Font families
  const fontFamilies = [
    'Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia', 'Verdana',
    'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Arial Black', 'Palatino', 'Garamond',
    'Bookman', 'Avant Garde', 'Tahoma', 'Century Gothic', 'Calibri', 'Cambria',
    'Consolas', 'Franklin Gothic Medium', 'Gill Sans', 'Lucida Grande',
    'Microsoft Sans Serif', 'Segoe UI', 'Open Sans', 'Roboto', 'Lato', 'Montserrat',
    'Source Sans Pro', 'Raleway'
  ];

  // Shape functions (same as original but with shared access context)
  const addRectangle = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.RECTANGLE));
    setShowShapeDropdown(false);
    setBorderWeight(1);
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'square') {
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        // Auto-save for shared editors
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const addCircle = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.ELLIPSE));
    setShowShapeDropdown(false);
    setBorderWeight(1);
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'circle') {
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const addTriangle = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.POLYGON));
    setShowShapeDropdown(false);
    setBorderWeight(1);
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'polygon') {
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const addLine = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.LINE));
    setShowShapeDropdown(false);
    setBorderWeight(1);
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'line') {
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const addArrow = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.ARROW));
    setShowShapeDropdown(false);
    setBorderWeight(1);
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'line') {
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const addFreeText = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.FREETEXT));
    setShowTypeDropdown(false);
    setBorderWeight(0);
    
    const tool = documentViewer.getTool(Tools.ToolNames.FREETEXT);
    tool.setStyles({
      StrokeThickness: 0,
      FillColor: new Annotations.Color(0, 0, 0, 0),
      TextColor: new Annotations.Color(0, 0, 0),
      FontSize: '12pt',
      Font: 'Arial',
    });
    
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'freetext') {
        annotations[0].setContents('[Insert text here]');
        annotations[0].setCustomData('Font', 'Arial');
        annotationManager.updateAnnotation(annotations[0]);
        documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        setTimeout(() => saveAnnotations(), 500);
      }
    }, { once: true });
  };

  const deleteAnnotation = () => {
    if (selectedAnnotation) {
      annotationManager.deleteAnnotation(selectedAnnotation);
      setSelectedAnnotation(null);
      setShowStylePanel(false);
      setTimeout(() => saveAnnotations(), 500);
    }
  };

  const handleShapeSelection = (shapeType: string) => {
    setSelectedShape(shapeType);
    switch (shapeType) {
      case 'rectangle': addRectangle(); break;
      case 'circle': addCircle(); break;
      case 'triangle': addTriangle(); break;
      case 'line': addLine(); break;
      case 'arrow': addArrow(); break;
      default: addRectangle();
    }
  };

  const handleColorSelection = (color: string, isTransparent: boolean = false) => {
    if (!selectedAnnotation) return;
    
    try {
      const colorValue = isTransparent ? 
        new Annotations.Color(0, 0, 0, 0) : 
        new Annotations.Color(color);
      
      if (styleMode === 'fill') {
        updateStyles({ fillColor: colorValue });
      } else {
        updateStyles({ strokeColor: colorValue });
      }
    } catch (error) {
      console.error('SharedAnnotationPanel: Error selecting color:', error);
    }
  };

  const updateStyles = (styles: any) => {
    if (!selectedAnnotation) return;
    
    try {
      const isShapeAnnotation = selectedAnnotation.elementName && [
        'square', 'circle', 'line', 'polygon', 'polyline', 'freehand', 'arc', 'note'
      ].includes(selectedAnnotation.elementName);
      
      const isFreeTextAnnotation = selectedAnnotation.elementName === 'freetext';
      
      if (isShapeAnnotation) {
        const stylesToUpdate: any = {};
        
        if (styles.fillColor !== undefined) stylesToUpdate.FillColor = styles.fillColor;
        if (styles.strokeColor !== undefined) stylesToUpdate.StrokeColor = styles.strokeColor;
        if (styles.strokeWeight !== undefined) stylesToUpdate.StrokeThickness = styles.strokeWeight;
        if (styles.opacity !== undefined) stylesToUpdate.Opacity = styles.opacity;
        
        annotationManager.setAnnotationStyles(selectedAnnotation, stylesToUpdate);
      } else if (isFreeTextAnnotation) {
        const stylesToUpdate: any = {};
        
        if (styles.fontFamily) {
          stylesToUpdate.Font = styles.fontFamily;
          selectedAnnotation.setCustomData('Font', styles.fontFamily);
        }
        if (styles.fontSize) stylesToUpdate.FontSize = styles.fontSize;
        if (styles.textColor) stylesToUpdate.TextColor = styles.textColor;
        if (styles.fillColor !== undefined) stylesToUpdate.FillColor = styles.fillColor;
        if (styles.strokeColor !== undefined) stylesToUpdate.StrokeColor = styles.strokeColor;
        if (styles.strokeWeight !== undefined) stylesToUpdate.StrokeThickness = styles.strokeWeight;
        if (styles.opacity !== undefined) stylesToUpdate.Opacity = styles.opacity;

        annotationManager.setAnnotationStyles(selectedAnnotation, stylesToUpdate);
      }
      
      annotationManager.updateAnnotation(selectedAnnotation);
      annotationManager.redrawAnnotation(selectedAnnotation);
      
      // Auto-save changes for shared editors
      setTimeout(() => saveAnnotations(), 500);
      
    } catch (error) {
      console.error('SharedAnnotationPanel: Error updating styles:', error);
    }
  };

  // Position calculations (same as original)
  const getStylePanelPosition = () => {
    const viewerElement = document.getElementById('scroll-view');
    const panelWidth = 320;
    const panelHeight = 400;
    
    if (selectedAnnotation && annotationPosition && viewerElement) {
      const viewerRect = viewerElement.getBoundingClientRect();
      let left = annotationPosition.x + 20;
      let top = annotationPosition.y - 20;
      
      if (left + panelWidth > viewerRect.right) {
        left = annotationPosition.x - panelWidth - 20;
      }
      if (left < viewerRect.left) {
        left = viewerRect.left + 10;
      }
      
      if (top + panelHeight > viewerRect.bottom) {
        top = annotationPosition.y - panelHeight - 20;
      }
      if (top < viewerRect.top) {
        top = annotationPosition.y + 50;
      }
      if (top + panelHeight > viewerRect.bottom) {
        top = viewerRect.bottom - panelHeight - 10;
      }
      if (top < viewerRect.top) {
        top = viewerRect.top + 10;
      }
      
      return {
        position: 'fixed',
        left: `${Math.max(viewerRect.left + 10, Math.min(left, viewerRect.right - panelWidth - 10))}px`,
        top: `${top}px`,
        zIndex: 1001,
      };
    } else {
      return {
        position: 'fixed',
        bottom: '160px',
        right: '20px',
        zIndex: 1001,
      };
    }
  };

  return (
    <>
      {/* Style Panel - updated with black-grey-white theme */}
      {showStylePanel && !(selectedAnnotation && selectedAnnotation.elementName === 'freetext') && (
        <>
          {annotationPosition && (
            <div
              className="absolute w-2 h-2 bg-gray-600 rounded-full opacity-75 transition-all ease-out"
              style={{
                position: 'fixed',
                left: `${annotationPosition.x - 4}px`,
                top: `${annotationPosition.y - 4}px`,
                zIndex: 1000,
              }}
            />
          )}
          <div 
            className="bg-white rounded-lg shadow-xl border border-gray-300 p-4 w-80 transition-all ease-out"
            style={getStylePanelPosition() as React.CSSProperties}
          >
            {/* Shared access indicator */}
            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Editing via shared link</span>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Style</h3>
            
            {/* Fill/Stroke Toggle */}
            <div className="flex bg-gray-200 rounded-full p-1 mb-4 w-full">
              <button 
                onClick={() => setStyleMode('fill')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all ${
                  styleMode === 'fill'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Fill
              </button>
              <button 
                onClick={() => setStyleMode('stroke')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all ${
                  styleMode === 'stroke'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stroke
              </button>
            </div>

            {/* Color Palette */}
            <div className="flex gap-2 mb-4">
              {colorPalette.map((colorOption, index) => (
                <button 
                  key={index}
                  onClick={() => handleColorSelection(colorOption.color, colorOption.isTransparent)}
                  className={`w-7 h-7 rounded-full border-2 border-gray-400 flex items-center justify-center transition-all hover:scale-110 ${
                    colorOption.isTransparent ? 'bg-white' : ''
                  }`}
                  style={{
                    backgroundColor: colorOption.isTransparent ? 'transparent' : colorOption.color,
                    borderColor: colorOption.color === '#FFFFFF' ? '#9CA3AF' : colorOption.color === '#000000' ? '#374151' : '#6B7280'
                  }}
                  title={colorOption.label}
                >
                  {colorOption.isTransparent && (
                    <div className="w-7 h-7 flex items-center justify-center">
                      <div className="w-7 h-0.5 bg-gray-500 rotate-45 absolute"></div>
                      <div className="w-7 h-7 border border-gray-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Border Weight */}
            {styleMode === 'stroke' && (
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-0.5 bg-gray-600"></div>
                    <div className="w-4 h-0.5 bg-gray-600"></div>
                    <div className="w-4 h-0.5 bg-gray-600"></div>
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={borderWeight}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setBorderWeight(value);
                        if (selectedAnnotation) {
                          updateStyles({ strokeWeight: value });
                        }
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer opacity-slider"
                      style={{
                        background: `linear-gradient(to right, #E5E7EB 0%, #374151 ${(borderWeight / 10) * 100}%, #E5E7EB ${(borderWeight / 10) * 100}%)`
                      }}
                    />
                  </div>
                  
                  <div className="bg-gray-100 px-3 py-1 rounded-md border border-gray-300">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={borderWeight}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setBorderWeight(value);
                        if (selectedAnnotation) {
                          updateStyles({ strokeWeight: value });
                        }
                      }}
                      className="w-8 text-sm font-medium text-gray-700 bg-transparent border-none outline-none text-center"
                    />
                    <span className="text-sm font-medium text-gray-700 ml-1">pt</span>
                  </div>
                </div>
              </div>
            )}

            {/* Opacity Slider */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Opacity</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setOpacity(value);
                      if (selectedAnnotation) {
                        updateStyles({ opacity: value / 100 });
                      }
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer opacity-slider"
                    style={{
                      background: `linear-gradient(to right, #F3F4F6 0%, #9CA3AF 50%, #374151 100%)`
                    }}
                  />
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-md text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {opacity}%
                </div>
              </div>
            </div>

            {/* Delete button */}
            {selectedAnnotation && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <button 
                  onClick={deleteAnnotation}
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded hover:bg-black transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Shape/Type Panel with black-grey-white theme */}
      <div className="fixed bottom-15 right-15 bg-white rounded-lg shadow-lg border-2 border-gray-300 p-2 z-1000">
        <div className="flex gap-3">
          {/* Shape Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShapeDropdown(!showShapeDropdown);
                setShowTypeDropdown(false);
              }}
              className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-200 transition-colors"
            >
              <span className="text-lg">▭</span>
              <span className="text-sm font-medium text-gray-800">Shape</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showShapeDropdown && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[120px]">
                {shapeOptions.map((shape) => (
                  <button
                    key={shape.value}
                    onClick={() => handleShapeSelection(shape.value)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <span className="text-lg w-7">{shape.icon}</span>
                    <span className="w-full text-left">{shape.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowShapeDropdown(false);
              }}
              className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-200 transition-colors"
            >
              <span className="text-lg font-bold text-gray-800">T</span>
              <span className="text-sm font-medium text-gray-800">Type</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTypeDropdown && (
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[120px]">
                <button
                  onClick={addFreeText}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  <span className="text-lg font-bold">T</span>
                  Free Text
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text Style Panel for FreeText - updated with black-grey-white theme */}
      {selectedAnnotation && selectedAnnotation.elementName === 'freetext' && (
        <>
          {annotationPosition && (
            <div
              className="absolute w-2 h-2 bg-gray-600 rounded-full opacity-75 transition-all ease-out"
              style={{
                position: 'fixed',
                left: `${annotationPosition.x - 4}px`,
                top: `${annotationPosition.y - 4}px`,
                zIndex: 1001,
              }}
            />
          )}
          <div 
            className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl w-80 transition-all ease-out"
            style={getStylePanelPosition() as React.CSSProperties}
          >
            {/* Shared access indicator */}
            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>Editing via shared link</span>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">Text Style</h3>
            
            {/* Font and Size Dropdowns */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <select
                  defaultValue={selectedAnnotation.Font || selectedAnnotation.getCustomData('Font') || 'Inter'}
                  onChange={(e) => updateStyles({ fontFamily: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
                >
                  <option value="Inter">Inter</option>
                  {fontFamilies.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  defaultValue={`${parseInt(selectedAnnotation.FontSize) || 12}pt`}
                  onChange={(e) => updateStyles({ fontSize: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
                >
                  {['8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '72pt'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Text Color Palette */}
            <div className="flex gap-2 mb-6 justify-center">
              {colorPalette.filter(c => !c.isTransparent).map((colorOption, index) => (
                <button
                  key={index}
                  onClick={() => updateStyles({ textColor: new Annotations.Color(colorOption.color) })}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: colorOption.color,
                    borderColor: colorOption.color === '#FFFFFF' ? '#9CA3AF' : colorOption.color === '#000000' ? '#374151' : '#6B7280'
                  }}
                  title={colorOption.label}
                />
              ))}
            </div>

            {/* Delete button */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={deleteAnnotation}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Click outside to close dropdowns */}
      {(showShapeDropdown || showTypeDropdown) && (
        <div 
          className="fixed inset-0 z-[999]" 
          onClick={() => {
            setShowShapeDropdown(false);
            setShowTypeDropdown(false);
          }}
        />
      )}

      {/* Custom CSS - updated for black-grey-white theme */}
      <style jsx>{`
        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6B7280;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .opacity-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6B7280;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  );
};

export default SharedAnnotationPanel; 