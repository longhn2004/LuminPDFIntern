'use client';

import React, { useState, useEffect } from 'react';
import { useAppTranslations } from '@/hooks/useTranslations';

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
  const translations = useAppTranslations();
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [styleMode, setStyleMode] = useState<'fill' | 'stroke'>('fill');
  const [opacity, setOpacity] = useState<number>(50);
  const [borderWeight, setBorderWeight] = useState<number>(1);
  const [annotationPosition, setAnnotationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
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
      
      const handleToolModeChange = (newTool: any) => {
        const toolName = newTool.name || 'unknown';
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
      console.log(translations.share("cannotSaveAnnotationsInsufficientPermissions"));
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
          alert(translations.share("conflictDetected"));
          return;
        }
        throw new Error(`Failed to save annotations: ${response.statusText}`);
      }
      
      const { version, responsexfdf } = await response.json();
      console.log(translations.share("annotationsSaved"), version);
      
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

  // For viewers, show read-only annotation panel (can view annotations but not edit)
  if (isViewer) {
    return null; // Viewers can now download with annotations but still can't edit
  }

  // Rest of the component is same as AnnotationPanel but only shows for editors
  // Shape options
  const shapeOptions = [
    { value: 'rectangle', label: translations.annotations('rectangle'), icon: '▭' },
    { value: 'circle', label: translations.annotations('circle'), icon: '○' },
    { value: 'triangle', label: translations.annotations('triangle'), icon: '△' },
    { value: 'line', label: translations.annotations('line'), icon: '/' },
    { value: 'arrow', label: translations.annotations('arrow'), icon: '↗' },
  ];

  // Color palette - updated to match AnnotationPanel
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

  // Position calculations with annotation avoidance
  const getStylePanelPosition = () => {
    const viewerElement = document.getElementById('scroll-view');
    const panelWidth = 320;
    const panelHeight = 400;
    
    if (selectedAnnotation && annotationPosition && viewerElement) {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // Calculate annotation bounds with some padding
      const annotationPadding = 40;
      const annotationLeft = annotationPosition.x - annotationPadding;
      const annotationRight = annotationPosition.x + annotationPadding;
      const annotationTop = annotationPosition.y - annotationPadding;
      const annotationBottom = annotationPosition.y + annotationPadding;
      
      let left = annotationPosition.x + 20;
      let top = annotationPosition.y - 20;
      
      // Try positioning to the right first
      if (left + panelWidth > windowWidth - 10) {
        // Try positioning to the left
        left = annotationPosition.x - panelWidth - 20;
        if (left < 10) {
          // If left doesn't work, position at safe distance from annotation
          left = annotationRight + 20;
          if (left + panelWidth > windowWidth - 10) {
            left = annotationLeft - panelWidth - 20;
            if (left < 10) {
              left = 10; // Last resort: left edge
      }
          }
        }
      }
      
      // Vertical positioning with annotation avoidance
      if (top + panelHeight > windowHeight - 10) {
        // Try positioning above annotation
        top = annotationTop - panelHeight - 20;
        if (top < 10) {
          // Position below annotation if above doesn't work
          top = annotationBottom + 20;
          if (top + panelHeight > windowHeight - 10) {
            // If it still doesn't fit, position at top with scrolling
            top = 10;
      }
        }
      }
      
      // Check if panel would cover annotation and adjust if needed
      const panelLeft = left;
      const panelRight = left + panelWidth;
      const panelTop = top;
      const panelBottom = top + panelHeight;
      
      // If panel overlaps with annotation area, try alternative positions
      if (panelLeft < annotationRight && panelRight > annotationLeft && 
          panelTop < annotationBottom && panelBottom > annotationTop) {
        
        // Try positioning further away
        const spaceRight = windowWidth - annotationRight;
        const spaceLeft = annotationLeft;
        const spaceTop = annotationTop;
        const spaceBottom = windowHeight - annotationBottom;
        
        if (spaceRight >= panelWidth + 30) {
          left = annotationRight + 30;
        } else if (spaceLeft >= panelWidth + 30) {
          left = annotationLeft - panelWidth - 30;
        } else if (spaceBottom >= panelHeight + 30) {
          top = annotationBottom + 30;
          left = Math.max(10, Math.min(annotationPosition.x - panelWidth/2, windowWidth - panelWidth - 10));
        } else if (spaceTop >= panelHeight + 30) {
          top = annotationTop - panelHeight - 30;
          left = Math.max(10, Math.min(annotationPosition.x - panelWidth/2, windowWidth - panelWidth - 10));
      }
      }
      
      // Final bounds check
      left = Math.max(10, Math.min(left, windowWidth - panelWidth - 10));
      top = Math.max(10, Math.min(top, windowHeight - panelHeight - 10));
      
      return {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1001,
        maxHeight: `${windowHeight - 20}px`,
        overflowY: 'auto',
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

  // Calculate text style panel position with enhanced annotation avoidance
  const getTextStylePanelPosition = () => {
    const viewerElement = document.getElementById('scroll-view');
    const panelWidth = 320;
    const panelHeight = 600; // Larger height for text style panel with Frame Style section
    
    if (annotationPosition && viewerElement) {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // Calculate annotation bounds with larger padding for text annotations
      const annotationPadding = 60;
      const annotationLeft = annotationPosition.x - annotationPadding;
      const annotationRight = annotationPosition.x + annotationPadding;
      const annotationTop = annotationPosition.y - annotationPadding;
      const annotationBottom = annotationPosition.y + annotationPadding;
      
      let left = annotationPosition.x + 20;
      let top = annotationPosition.y - 20;
      
      // Try positioning to the right first
      if (left + panelWidth > windowWidth - 10) {
        // Try positioning to the left
        left = annotationPosition.x - panelWidth - 20;
        if (left < 10) {
          // Position at safe distance from annotation
          left = annotationRight + 30;
          if (left + panelWidth > windowWidth - 10) {
            left = annotationLeft - panelWidth - 30;
            if (left < 10) {
              left = 10;
            }
          }
        }
      }
      
      // Vertical positioning with annotation avoidance
      if (top + panelHeight > windowHeight - 10) {
        // Try positioning above annotation
        top = annotationTop - panelHeight - 30;
        if (top < 10) {
          // Position below annotation if above doesn't work
          top = annotationBottom + 30;
          if (top + panelHeight > windowHeight - 10) {
            // If it still doesn't fit, position at top with scrolling
            top = 10;
          }
        }
      }
      
      // Check if panel would cover annotation and adjust if needed
      const panelLeft = left;
      const panelRight = left + panelWidth;
      const panelTop = top;
      const panelBottom = top + panelHeight;
      
      // If panel overlaps with annotation area, find better position
      if (panelLeft < annotationRight && panelRight > annotationLeft && 
          panelTop < annotationBottom && panelBottom > annotationTop) {
        
        // Calculate available space in each direction
        const spaceRight = windowWidth - annotationRight;
        const spaceLeft = annotationLeft;
        const spaceTop = annotationTop;
        const spaceBottom = windowHeight - annotationBottom;
        
        // Choose best position based on available space
        if (spaceRight >= panelWidth + 40) {
          // Position to the right of annotation
          left = annotationRight + 40;
          top = Math.max(10, Math.min(annotationPosition.y - panelHeight/2, windowHeight - panelHeight - 10));
        } else if (spaceLeft >= panelWidth + 40) {
          // Position to the left of annotation
          left = annotationLeft - panelWidth - 40;
          top = Math.max(10, Math.min(annotationPosition.y - panelHeight/2, windowHeight - panelHeight - 10));
        } else if (spaceBottom >= panelHeight + 40) {
          // Position below annotation
          top = annotationBottom + 40;
          left = Math.max(10, Math.min(annotationPosition.x - panelWidth/2, windowWidth - panelWidth - 10));
        } else if (spaceTop >= panelHeight + 40) {
          // Position above annotation
          top = annotationTop - panelHeight - 40;
          left = Math.max(10, Math.min(annotationPosition.x - panelWidth/2, windowWidth - panelWidth - 10));
        } else {
          // Last resort: position in corner that doesn't overlap
          if (spaceRight > spaceLeft) {
            left = Math.max(annotationRight + 10, windowWidth - panelWidth - 10);
          } else {
            left = Math.min(annotationLeft - panelWidth - 10, 10);
          }
          if (spaceBottom > spaceTop) {
            top = Math.max(annotationBottom + 10, windowHeight - panelHeight - 10);
          } else {
            top = Math.min(annotationTop - panelHeight - 10, 10);
          }
        }
      }
      
      // Final bounds check
      left = Math.max(10, Math.min(left, windowWidth - panelWidth - 10));
      top = Math.max(10, Math.min(top, windowHeight - panelHeight - 10));
      
      return {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1002,
        maxHeight: `${windowHeight - 20}px`,
        overflowY: 'auto',
      };
    } else {
      // Fallback position when no annotation position is available
      return {
        position: 'fixed',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1002,
        maxHeight: `${window.innerHeight - 40}px`,
        overflowY: 'auto',
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
            {/* Shared access indicator */}
            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>{translations.share("editingViaSharedLink")}</span>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations("style")}</h3>
            
            {/* Fill/Stroke Toggle */}
            <div className="flex bg-gray-200 rounded-full p-1 mb-4 w-full">
              <button 
                onClick={() => setStyleMode('fill')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'fill'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations("fill")}
              </button>
              <button 
                onClick={() => setStyleMode('stroke')}
                className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                  styleMode === 'stroke'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {translations.annotations("stroke")}
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
                        background: `linear-gradient(to right, #e5e7eb 0%, #3b82f6 ${(borderWeight / 10) * 100}%, #e5e7eb ${(borderWeight / 10) * 100}%)`
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">{translations.annotations("opacity")}</h4>
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

            {/* Delete button */}
            {selectedAnnotation && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <button 
                  onClick={deleteAnnotation}
                  className="flex items-center gap-2 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm rounded cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {translations.common("delete")}
                </button>
              </div>
            )}
          </div>
        </>
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
              <span className="text-sm font-medium text-gray-700">{translations.annotations("shape")}</span>
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
              <span className="text-sm font-medium text-gray-700">{translations.annotations("type")}</span>
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
                  {translations.annotations("freeText")}
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
            className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl w-80 transition-all ease-out"
            style={getTextStylePanelPosition() as React.CSSProperties}
          >
            {/* Shared access indicator */}
            <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span>{translations.share("editingViaSharedLink")}</span>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">{translations.annotations("textStyle")}</h3>
            
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
              <h3 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations("frameStyle")}</h3>
              
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
                  {translations.annotations("fill")}
                </button>
                <button
                  onClick={() => setStyleMode('stroke')}
                  className={`px-6 py-2 rounded-full w-1/2 text-sm font-medium transition-all cursor-pointer ${
                    styleMode === 'stroke'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {translations.annotations("borderLine")}
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
              <h4 className="text-lg font-medium text-gray-900 mb-3">{translations.annotations("opacity")}</h4>
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
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={deleteAnnotation}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {translations.common("delete")}
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

      {/* Custom CSS - updated to match AnnotationPanel */}
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
    </>
  );
};

export default SharedAnnotationPanel; 