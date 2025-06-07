import React, { useState, useEffect, useCallback } from 'react';
import { useAppTranslations } from '@/hooks/useTranslations';

// PDF Viewer API interface types
interface PDFAnnotation {
  elementName?: string;
  getRect?: () => { x1: number; y1: number; x2: number; y2: number };
  Opacity?: number;
  StrokeThickness?: number;
  setContents?: (content: string) => void;
  setCustomData?: (key: string, value: string) => void;
  getCustomData?: (key: string) => string;
  Font?: string;
  FontSize?: string;
  constructor: { name: string };
}

interface PDFAnnotationManager {
  getSelectedAnnotations: () => PDFAnnotation[];
  addEventListener: (event: string, handler: (...args: unknown[]) => void, options?: { once?: boolean }) => void;
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  deleteAnnotation: (annotation: PDFAnnotation) => void;
  setAnnotationStyles: (annotation: PDFAnnotation, styles: Record<string, unknown>) => void;
  updateAnnotation: (annotation: PDFAnnotation) => void;
  redrawAnnotation: (annotation: PDFAnnotation) => void;
}

interface PDFDocumentViewer {
  getZoomLevel: () => number;
  setToolMode: (tool: unknown) => void;
  getTool: (toolName: string) => PDFTool;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface PDFTool {
  name?: string;
  setStyles?: (styles: Record<string, unknown>) => void;
}

type PDFColor = {
  new (r: number, g: number, b: number, a?: number): PDFColor;
  new (hex: string): PDFColor;
}

interface PDFAnnotations {
  Color: PDFColor;
}

interface PDFTools {
  ToolNames: {
    TEXT_SELECT: string;
    RECTANGLE: string;
    ELLIPSE: string;
    POLYGON: string;
    LINE: string;
    ARROW: string;
    FREETEXT: string;
  };
}

interface PDFCore {
  Annotations: PDFAnnotations;
  Tools: PDFTools;
}

interface AnnotationPanelProps {
  pdfId: string;
  annotationManager: unknown;
  documentViewer: unknown;
  userRole: string;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  pdfId,
  annotationManager,
  documentViewer,
  userRole,
}) => {
  const translations = useAppTranslations();
  const [selectedAnnotation, setSelectedAnnotation] = useState<PDFAnnotation | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [styleMode, setStyleMode] = useState<'fill' | 'stroke'>('fill');
  const [opacity, setOpacity] = useState<number>(50);
  const [borderWeight, setBorderWeight] = useState<number>(1);
  const [annotationPosition, setAnnotationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [trackingPosition, setTrackingPosition] = useState(false);

  // Function to update annotation position
  const updateAnnotationPosition = useCallback((annotation: PDFAnnotation | null) => {
    if (!annotation) {
      setAnnotationPosition(null);
      return;
    }

    try {
      const rect = annotation.getRect?.();
      if (rect && documentViewer) {
        // Get the current zoom level and scroll position
        const docViewer = documentViewer as PDFDocumentViewer;
        const zoom = docViewer.getZoomLevel();
        const scrollElement = document.getElementById('scroll-view');
        
        if (scrollElement) {
          const scrollRect = scrollElement.getBoundingClientRect();
          const scrollTop = scrollElement.scrollTop;
          const scrollLeft = scrollElement.scrollLeft;
          
          // Calculate position accounting for zoom and scroll
          const x = (rect.x1 * zoom) - scrollLeft + scrollRect.left;
          const y = (rect.y1 * zoom) - scrollTop + scrollRect.top;
          
          setAnnotationPosition({ x, y });
          console.log('AnnotationPanel: Position updated:', { x, y, zoom, rect });
        }
      }
    } catch (error) {
      console.error('AnnotationPanel: Error getting annotation position:', error);
      setAnnotationPosition(null);
    }
  }, [documentViewer]);

  // Initial mount effect
  useEffect(() => {
    console.log('AnnotationPanel: Mounted with props:', { pdfId, userRole, hasAnnotationManager: !!annotationManager, hasDocumentViewer: !!documentViewer });
  }, [pdfId, userRole, annotationManager, documentViewer]);

  // Handle annotation selection
  useEffect(() => {
    if (!annotationManager) return;

    const handleSelection = () => {
      const manager = annotationManager as PDFAnnotationManager;
      const selected = manager.getSelectedAnnotations();
      const annotation = selected.length === 1 ? selected[0] : null;
      setSelectedAnnotation(annotation);
      setShowStylePanel(selected.length === 1);
      
      // Initialize style values from selected annotation
      if (annotation) {
        setOpacity(Math.round((annotation.Opacity || 1) * 100));
        
        // Set default border weight based on annotation type
        if (annotation.elementName === 'freetext') {
          setBorderWeight(annotation.StrokeThickness || 0); // FreeText default: 0
        } else {
          setBorderWeight(annotation.StrokeThickness || 1); // Shape default: 1
        }
        
        updateAnnotationPosition(annotation);
        setTrackingPosition(true);
      } else {
        setAnnotationPosition(null);
        setTrackingPosition(false);
      }
      
      console.log('AnnotationPanel: Annotation selected:', selected.length > 0 ? selected[0] : 'None');
    };
    
    const manager = annotationManager as PDFAnnotationManager;
    manager.addEventListener('annotationSelected', handleSelection);
    return () => {
      manager.removeEventListener('annotationSelected', handleSelection);
    };
  }, [annotationManager, updateAnnotationPosition]);

  // Track position changes when annotation is selected
  useEffect(() => {
    if (!trackingPosition || !selectedAnnotation || !documentViewer || !annotationManager) return;

    const updatePosition = () => {
      updateAnnotationPosition(selectedAnnotation);
    };

    // Listen for zoom changes
    const handleZoomUpdated = () => {
      updatePosition();
    };

    // Listen for scroll events
    const scrollElement = document.getElementById('scroll-view');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', updatePosition);
    }

    // Listen for zoom changes
    const docViewer = documentViewer as PDFDocumentViewer;
    docViewer.addEventListener('zoomUpdated', handleZoomUpdated);

    // Listen for annotation changes (in case annotation is moved/resized)
    const handleAnnotationChanged = (...args: unknown[]) => {
      const [annotations, action] = args as [unknown[], string];
      if (action === 'modify' && annotations.includes(selectedAnnotation)) {
        updatePosition();
      }
    };
    const manager = annotationManager as PDFAnnotationManager;
    manager.addEventListener('annotationChanged', handleAnnotationChanged);

    // Update position more frequently for smoother tracking
    const positionUpdateInterval = setInterval(updatePosition, 16); // ~60fps for smooth tracking

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', updatePosition);
      }
      docViewer.removeEventListener('zoomUpdated', handleZoomUpdated);
      manager.removeEventListener('annotationChanged', handleAnnotationChanged);
      clearInterval(positionUpdateInterval);
    };
  }, [trackingPosition, selectedAnnotation, documentViewer, annotationManager, updateAnnotationPosition]);

  // Enable text selection mode by default and track tool changes
  useEffect(() => {
    if (!documentViewer) return;

    const Tools = (window as unknown as { Core?: PDFCore }).Core?.Tools;
    if (documentViewer && Tools) {
      // Set to text select mode by default to allow text selection
      const docViewer = documentViewer as PDFDocumentViewer;
      docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
      
      // Listen for tool mode changes
      const handleToolModeChange = (newTool: unknown) => {
        const tool = newTool as PDFTool;
        const toolName = tool.name || 'unknown';
        console.log('AnnotationPanel: Tool changed to:', toolName);
      };
      
      docViewer.addEventListener('toolModeUpdated', handleToolModeChange);
      
      return () => {
        docViewer.removeEventListener('toolModeUpdated', handleToolModeChange);
      };
    }
  }, [documentViewer]);

  // Early return for non-editor users - after all hooks
  if (userRole === 'viewer') {
    console.log('AnnotationPanel: Not rendering because userRole is not editor:', userRole);
    return null;
  }

  const Annotations = (window as unknown as { Core?: PDFCore }).Core?.Annotations;
  const Tools = (window as unknown as { Core?: PDFCore }).Core?.Tools;

  if (!Annotations || !Tools) {
    console.error('AnnotationPanel: window.Core.Annotations or window.Core.Tools is not available');
    return null;
  }

  // Shape options with clean icons
  const shapeOptions = [
    { value: 'rectangle', label: translations.annotations('rectangle'), icon: '▭' },
    { value: 'circle', label: translations.annotations('circle'), icon: '○' },
    { value: 'triangle', label: translations.annotations('triangle'), icon: '△' },
    { value: 'line', label: translations.annotations('line'), icon: '/' },
    { value: 'arrow', label: translations.annotations('arrow'), icon: '↗' },
  ];

  // Predefined color palette
  const colorPalette = [
    { color: 'transparent', label: translations.annotations('colors.noFill'), isTransparent: true },
    { color: '#000000', label: translations.annotations('colors.black') },
    { color: '#E53E3E', label: translations.annotations('colors.red') },
    { color: '#3182CE', label: translations.annotations('colors.blue') },
    { color: '#38A169', label: translations.annotations('colors.green') },
    { color: '#D69E2E', label: translations.annotations('colors.yellow') },
    { color: '#B794F6', label: translations.annotations('colors.purple') },
    { color: '#FFFFFF', label: translations.annotations('colors.white') },
  ];

  // Font families list
  const fontFamilies = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Helvetica',
    'Georgia',
    'Verdana',
    'Comic Sans MS',
    'Impact',
    'Trebuchet MS',
    'Arial Black',
    'Palatino',
    'Garamond',
    'Bookman',
    'Avant Garde',
    'Tahoma',
    'Century Gothic',
    'Calibri',
    'Cambria',
    'Consolas',
    'Franklin Gothic Medium',
    'Gill Sans',
    'Lucida Grande',
    'Microsoft Sans Serif',
    'Segoe UI',
    'Open Sans',
    'Roboto',
    'Lato',
    'Montserrat',
    'Source Sans Pro',
    'Raleway'
  ];

  // Shape functions
  const addRectangle = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.RECTANGLE));
    setShowShapeDropdown(false);
    setBorderWeight(1); // Set border weight to 1 for shapes
    // Add event listener to return to text selection mode after annotation is added
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'square') {
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: Rectangle annotation added, returning to text selection mode');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add Rectangle triggered');
  };

  const addCircle = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.ELLIPSE));
    setShowShapeDropdown(false);
    setBorderWeight(1); // Set border weight to 1 for shapes
    // Add event listener to return to text selection mode after annotation is added
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'circle') {
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: Circle annotation added, returning to text selection mode');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add Circle triggered');
  };

  const addTriangle = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.POLYGON));
    setShowShapeDropdown(false);
    setBorderWeight(1); // Set border weight to 1 for shapes
    // Add event listener to return to text selection mode after annotation is added
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'polygon') {
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: Triangle annotation added, returning to text selection mode');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add Triangle triggered');
  };

  const addLine = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.LINE));
    setShowShapeDropdown(false);
    setBorderWeight(1); // Set border weight to 1 for shapes
    // Add event listener to return to text selection mode after annotation is added
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'line') {
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: Line annotation added, returning to text selection mode');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add Line triggered');
  };

  const addArrow = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.ARROW));
    setShowShapeDropdown(false);
    setBorderWeight(1); // Set border weight to 1 for shapes
    // Add event listener to return to text selection mode after annotation is added
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'line') { // Arrow is a line element
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: Arrow annotation added, returning to text selection mode');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add Arrow triggered');
  };

  const addFreeText = () => {
    const docViewer = documentViewer as PDFDocumentViewer;
    const manager = annotationManager as PDFAnnotationManager;
    docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.FREETEXT));
    setShowTypeDropdown(false);
    setBorderWeight(0); // Set border weight to 0 for FreeText
    const tool = docViewer.getTool(Tools.ToolNames.FREETEXT);
    tool.setStyles?.({
      StrokeThickness: 0,
      FillColor: new Annotations.Color(0, 0, 0, 0),
      TextColor: new Annotations.Color(0, 0, 0),
      FontSize: '12pt',
      Font: 'Arial',
    });
    manager.addEventListener('annotationChanged', (...args: unknown[]) => {
      const [annotations, action] = args as [PDFAnnotation[], string];
      if (action === 'add' && annotations[0] && annotations[0].elementName === 'freetext') {
        annotations[0].setContents?.('[Insert text here]');
        annotations[0].setCustomData?.('Font', 'Arial');
        manager.updateAnnotation(annotations[0]);
        // Return to text selection mode after adding annotation
        docViewer.setToolMode(docViewer.getTool(Tools.ToolNames.TEXT_SELECT));
        console.log('AnnotationPanel: FreeText annotation added with placeholder');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add FreeText triggered');
  };

  const deleteAnnotation = () => {
    if (selectedAnnotation) {
      const manager = annotationManager as PDFAnnotationManager;
      manager.deleteAnnotation(selectedAnnotation);
      setSelectedAnnotation(null);
      setShowStylePanel(false);
      console.log('AnnotationPanel: Annotation deleted');
    }
  };

  const handleShapeSelection = (shapeType: string) => {
    switch (shapeType) {
      case 'rectangle':
        addRectangle();
        break;
      case 'circle':
        addCircle();
        break;
      case 'triangle':
        addTriangle();
        break;
      case 'line':
        addLine();
        break;
      case 'arrow':
        addArrow();
        break;
      default:
        addRectangle();
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
      console.error('AnnotationPanel: Error selecting color:', error);
    }
  };

  const updateStyles = (styles: Record<string, unknown>) => {
    if (!selectedAnnotation) return;
    
    try {
      const annotation = selectedAnnotation;
      const manager = annotationManager as PDFAnnotationManager;
      console.log('AnnotationPanel: Updating styles for annotation type:', annotation.constructor.name);
      console.log('AnnotationPanel: Styles to apply:', styles);
      
      // Check annotation types using elementName property for better compatibility
      const isShapeAnnotation = annotation.elementName && [
        'square', 'circle', 'line', 'polygon', 'polyline', 'freehand', 'arc', 'note'
      ].includes(annotation.elementName);
      
      const isFreeTextAnnotation = annotation.elementName === 'freetext';
      
      // Handle shape annotations
      if (isShapeAnnotation) {
        const stylesToUpdate: Record<string, unknown> = {};
        
        if (styles.fillColor !== undefined) {
          stylesToUpdate.FillColor = styles.fillColor;
        }
        if (styles.strokeColor !== undefined) {
          stylesToUpdate.StrokeColor = styles.strokeColor;
        }
        if (styles.strokeWeight !== undefined) {
          stylesToUpdate.StrokeThickness = styles.strokeWeight;
        }
        if (styles.opacity !== undefined) {
          stylesToUpdate.Opacity = styles.opacity;
        }
        
        manager.setAnnotationStyles(annotation, stylesToUpdate);
      } else if (isFreeTextAnnotation) {
        // Update FreeText annotation styles properly
        const stylesToUpdate: Record<string, unknown> = {};
        
        // Handle text properties
        if (styles.fontFamily) {
          stylesToUpdate.Font = styles.fontFamily;
          annotation.setCustomData?.('Font', styles.fontFamily as string);
        }
        if (styles.fontSize) {
          stylesToUpdate.FontSize = styles.fontSize;
        }
        if (styles.textColor) {
          stylesToUpdate.TextColor = styles.textColor;
        }
        
        // Handle background and border properties
        if (styles.fillColor !== undefined) {
          stylesToUpdate.FillColor = styles.fillColor;
        }
        if (styles.strokeColor !== undefined) {
          stylesToUpdate.StrokeColor = styles.strokeColor;
        }
        if (styles.strokeWeight !== undefined) {
          stylesToUpdate.StrokeThickness = styles.strokeWeight;
        }
        if (styles.opacity !== undefined) {
          stylesToUpdate.Opacity = styles.opacity;
        }

        manager.setAnnotationStyles(annotation, stylesToUpdate);
      }
      
      // Update and redraw the annotation
      manager.updateAnnotation(annotation);
      manager.redrawAnnotation(annotation);
      
      console.log('AnnotationPanel: Styles successfully updated');
      
    } catch (error) {
      console.error('AnnotationPanel: Error updating styles:', error);
    }
  };

  // Calculate style panel position with bounds checking
  const getStylePanelPosition = () => {
    const viewerElement = document.getElementById('scroll-view');
    const panelWidth = 320; // Approximate panel width
    const panelHeight = 400; // Approximate panel height
    
    if (selectedAnnotation && annotationPosition && viewerElement) {
      const viewerRect = viewerElement.getBoundingClientRect();
      let left = annotationPosition.x + 20; // Closer to annotation
      let top = annotationPosition.y - 20; // Slightly above annotation
      
      // Keep panel within viewer bounds with smart positioning
      if (left + panelWidth > viewerRect.right) {
        left = annotationPosition.x - panelWidth - 20; // Position to the left
      }
      if (left < viewerRect.left) {
        left = viewerRect.left + 10;
      }
      
      // If panel would go below viewport, position it above the annotation
      if (top + panelHeight > viewerRect.bottom) {
        top = annotationPosition.y - panelHeight - 20;
      }
      
      // If panel would go above viewport, position it below the annotation
      if (top < viewerRect.top) {
        top = annotationPosition.y + 50;
      }
      
      // Final bounds check
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
      // Position above Shape/Type section when adding new annotation
      return {
        position: 'fixed',
        bottom: '160px',
        right: '20px',
        zIndex: 1001,
      };
    }
  };

  // Calculate text style panel position with bounds checking
  const getTextStylePanelPosition = () => {
    const viewerElement = document.getElementById('scroll-view');
    const panelWidth = 320;
    const panelHeight = 500;
    
    if (annotationPosition && viewerElement) {
      const viewerRect = viewerElement.getBoundingClientRect();
      let left = annotationPosition.x + 20; // Closer to annotation
      let top = annotationPosition.y - 20; // Slightly above annotation
      
      // Keep panel within viewer bounds with smart positioning
      if (left + panelWidth > viewerRect.right) {
        left = annotationPosition.x - panelWidth - 20; // Position to the left
      }
      if (left < viewerRect.left) {
        left = viewerRect.left + 10;
      }
      
      // If panel would go below viewport, position it above the annotation
      if (top + panelHeight > viewerRect.bottom) {
        top = annotationPosition.y - panelHeight - 20;
      }
      
      // If panel would go above viewport, position it below the annotation
      if (top < viewerRect.top) {
        top = annotationPosition.y + 50;
      }
      
      // Final bounds check
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
        zIndex: 1002,
      };
    } else {
      return {
        position: 'fixed',
        right: '420px',
        bottom: '200px',
        zIndex: 1002,
      };
    }
  };

  return (
    <div>
      {/* Style Panel for Shape Annotations - positioned based on context */}
      {showStylePanel && !!selectedAnnotation && selectedAnnotation.elementName !== 'freetext' && (
        <div>
          {/* Connection indicator */}
          {annotationPosition && (
            <div
              className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-75 transition-all ease-out"
              style={{
                position: 'fixed',
                left: `${annotationPosition.x - 4}px`,
                top: `${annotationPosition.y - 4}px`,
                zIndex: 1000,
              }}
            />
          )}
          <div 
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 transition-all ease-out"
            style={getStylePanelPosition() as React.CSSProperties}
          >

          {/* Style Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations('style')}</h3>
            
            {/* Fill/Stroke Toggle */}
            <div className="flex bg-gray-100 rounded-full p-1 mb-4 w-full">
      <button 
                onClick={() => setStyleMode('fill')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'fill'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations('fill')}
      </button>
      <button 
                onClick={() => setStyleMode('stroke')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'stroke'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations('stroke')}
      </button>
            </div>

                        {/* Color Palette */}
            <div className="flex gap-2 mb-4">
              {colorPalette.map((colorOption, index) => (
        <button 
                  key={index}
                  onClick={() => handleColorSelection(colorOption.color, colorOption.isTransparent)}
                  className={`w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                    colorOption.isTransparent ? 'bg-white' : ''
                  }`}
                  style={{
                    backgroundColor: colorOption.isTransparent ? 'transparent' : colorOption.color,
                    borderColor: colorOption.color === '#FFFFFF' ? '#d1d5db' : 'transparent'
                  }}
                  title={colorOption.label}
                >
                  {colorOption.isTransparent && (
                    <div className="w-7 h-7 flex items-center justify-center">
                      <div className="w-7 h-0.5 bg-red-500 rotate-45 absolute"></div>
                      <div className="w-7 h-7 border border-gray-400 rounded-full"></div>
                    </div>
                  )}
        </button>
              ))}
            </div>

            {/* Border Weight - only show when stroke mode is selected */}
            {styleMode === 'stroke' && (
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  {/* Border weight icon */}
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-0.5 bg-gray-600"></div>
                    <div className="w-4 h-0.5 bg-gray-600"></div>
                    <div className="w-4 h-0.5 bg-gray-600"></div>
              </div>
                  
                  {/* Slider */}
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
                        background: `linear-gradient(to right, #e5e7eb 0%, #3b82f6 ${(borderWeight / 10) * 100}%, #e5e7eb ${(borderWeight / 10) * 100}%)`
                      }}
                />
              </div>
                  
                  {/* Input field */}
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">{translations.annotations('opacity')}</h4>
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
                      background: `linear-gradient(to right, #f3f4f6 0%, #9ca3af 50%, #374151 100%)`
                    }}
                  />
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-md text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {opacity}%
                </div>
              </div>
            </div>

            {/* Delete button for selected annotations */}
            {!!selectedAnnotation && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <button 
                  onClick={deleteAnnotation}
                  className="flex items-center gap-2 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm rounded cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {translations.common('delete')}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Shape/Type Panel - Fixed at bottom right */}
      <div className="fixed bottom-15 right-15 bg-white rounded-lg shadow-sm border border-gray-200 p-2 z-1000">
        <div className="flex gap-3">
          {/* Shape Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShapeDropdown(!showShapeDropdown);
                setShowTypeDropdown(false);
              }}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="text-lg">▭</span>
              <span className="text-sm font-medium text-gray-700">{translations.annotations('shape')}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showShapeDropdown && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[120px]">
                {shapeOptions.map((shape) => (
                  <button
                    key={shape.value}
                    onClick={() => handleShapeSelection(shape.value)}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
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
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="text-lg font-bold">T</span>
              <span className="text-sm font-medium text-gray-700">{translations.annotations('type')}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTypeDropdown && (
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[120px]">
                <button
                  onClick={addFreeText}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <span className="text-lg font-bold">T</span>
                  {translations.annotations('freeText')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redesigned Text Style Panel for FreeText annotations */}
      {!!selectedAnnotation && selectedAnnotation.elementName === 'freetext' && (
        <div>
          {/* Connection indicator for text annotations */}
          {annotationPosition && (
            <div
              className="absolute w-2 h-2 bg-blue-500 rounded-full opacity-75 transition-all ease-out"
              style={{
                position: 'fixed',
                left: `${annotationPosition.x - 4}px`,
                top: `${annotationPosition.y - 4}px`,
                zIndex: 1001,
              }}
            />
          )}
          <div 
            className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg w-80 transition-all ease-out"
            style={getTextStylePanelPosition() as React.CSSProperties}
          >
          <h3 className="text-lg font-medium text-gray-900 mb-4">{translations.annotations('textStyle')}</h3>
          
          {/* Font and Size Dropdowns */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <select
                defaultValue={selectedAnnotation.Font || selectedAnnotation.getCustomData?.('Font') || 'Inter'}
                onChange={(e) => updateStyles({ fontFamily: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="Inter">Inter</option>
                {fontFamilies.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                defaultValue={`${parseInt(selectedAnnotation.FontSize || '12') || 12}pt`}
                onChange={(e) => updateStyles({ fontSize: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="8pt">8pt</option>
                <option value="10pt">10pt</option>
                <option value="12pt">12pt</option>
                <option value="14pt">14pt</option>
                <option value="16pt">16pt</option>
                <option value="18pt">18pt</option>
                <option value="20pt">20pt</option>
                <option value="24pt">24pt</option>
                <option value="28pt">28pt</option>
                <option value="32pt">32pt</option>
                <option value="36pt">36pt</option>
                <option value="48pt">48pt</option>
                <option value="72pt">72pt</option>
              </select>
            </div>
          </div>

          {/* Text Color Palette */}
          <div className="flex gap-2 mb-6 justify-center">
            {colorPalette.filter(c => !c.isTransparent).map((colorOption, index) => (
              <button
                key={index}
                onClick={() => updateStyles({ textColor: new Annotations.Color(colorOption.color) })}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 cursor-pointer ${
                  colorOption.color === '#000000' ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{
                  backgroundColor: colorOption.color,
                  borderColor: colorOption.color === '#FFFFFF' ? '#d1d5db' : colorOption.color === '#000000' ? '#1f2937' : 'transparent'
                }}
                title={colorOption.label}
              >
                {colorOption.color === '#000000' && (
                  <div className="w-full h-full rounded-full border-2 border-white"></div>
                )}
              </button>
            ))}
          </div>

          {/* Frame Style Section */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations('frameStyle')}</h3>
            
            {/* Fill/Border Toggle */}
            <div className="flex bg-gray-100 rounded-full p-1 mb-4 w-full">
              <button
                onClick={() => setStyleMode('fill')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'fill'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations('fill')}
              </button>
              <button
                onClick={() => setStyleMode('stroke')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'stroke'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations('borderLine')}
              </button>
            </div>

                                      {/* Frame Color Palette */}
             <div className="flex gap-2 mb-4">
               {colorPalette.map((colorOption, index) => (
                 <button
                   key={index}
                   onClick={() => {
                     if (styleMode === 'fill') {
                       const colorValue = colorOption.isTransparent ? 
                         new Annotations.Color(0, 0, 0, 0) : 
                         new Annotations.Color(colorOption.color);
                       updateStyles({ fillColor: colorValue });
                     } else {
                       const colorValue = colorOption.isTransparent ? 
                         new Annotations.Color(0, 0, 0, 0) : 
                         new Annotations.Color(colorOption.color);
                       updateStyles({ strokeColor: colorValue });
                     }
                   }}
                   className={`w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                     colorOption.isTransparent ? 'bg-white' : ''
                   }`}
                   style={{
                     backgroundColor: colorOption.isTransparent ? 'transparent' : colorOption.color,
                     borderColor: colorOption.color === '#FFFFFF' ? '#d1d5db' : 'transparent'
                   }}
                   title={colorOption.label}
                 >
                   {colorOption.isTransparent && (
                     <div className="w-7 h-7 flex items-center justify-center">
                       <div className="w-7 h-0.5 bg-red-500 rotate-45 absolute"></div>
                       <div className="w-7 h-7 border border-gray-400 rounded-full"></div>
                     </div>
                   )}
                 </button>
               ))}
             </div>

             {/* Border Weight - only show when Border line mode is selected */}
             {styleMode === 'stroke' && (
               <div className="mb-4">
                 <div className="flex items-center gap-3">
                   {/* Border weight icon */}
                   <div className="flex flex-col gap-1">
                     <div className="w-4 h-0.5 bg-gray-600"></div>
                     <div className="w-4 h-0.5 bg-gray-600"></div>
                     <div className="w-4 h-0.5 bg-gray-600"></div>
              </div>
                   
                   {/* Slider */}
                   <div className="flex-1">
                <input
                       type="range"
                       min="0"
                       max="10"
                       value={borderWeight}
                       onChange={(e) => {
                         const value = parseInt(e.target.value);
                         setBorderWeight(value);
                         updateStyles({ strokeWeight: value });
                       }}
                       className="w-full h-2 rounded-lg appearance-none cursor-pointer opacity-slider"
                       style={{
                         background: `linear-gradient(to right, #e5e7eb 0%, #3b82f6 ${(borderWeight / 10) * 100}%, #e5e7eb ${(borderWeight / 10) * 100}%)`
                       }}
                />
              </div>
                   
                   {/* Input field */}
                   <div className="bg-gray-100 px-3 py-2 rounded-md border border-gray-300">
                <input
                  type="number"
                  min="0"
                  max="10"
                       value={borderWeight}
                       onChange={(e) => {
                         const value = parseInt(e.target.value) || 0;
                         setBorderWeight(value);
                         updateStyles({ strokeWeight: value });
                       }}
                       className="w-8 text-sm font-medium text-gray-700 bg-transparent border-none outline-none text-center"
                     />
                     <span className="text-sm font-medium text-gray-700 ml-1">pt</span>
                   </div>
                 </div>
               </div>
             )}
              </div>

          {/* Opacity Slider */}
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations('opacity')}</h4>
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
                    updateStyles({ opacity: value / 100 });
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer opacity-slider"
                  style={{
                    background: `linear-gradient(to right, #f3f4f6 0%, #9ca3af 50%, #374151 100%)`
                  }}
                />
              </div>
              <div className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-700 min-w-[4rem] text-center border border-gray-300">
                {opacity} %
              </div>
            </div>
          </div>

          {/* Delete button */}
          {!!selectedAnnotation && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={deleteAnnotation}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {translations.common('delete')}
              </button>
            </div>
          )}
        </div>
        </div>
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

      {/* Custom CSS for opacity slider */}
      <style jsx>{`
        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #9ca3af;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .opacity-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid #9ca3af;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AnnotationPanel;