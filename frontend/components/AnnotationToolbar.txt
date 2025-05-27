import React, { useState, useEffect, useRef } from 'react';
import { FaSquare, FaFont, FaPalette, FaTrash, FaChevronDown, FaBold, FaItalic, FaUnderline } from 'react-icons/fa';
import { MdRectangle, MdCircle, MdArrowUpward } from 'react-icons/md';

// Define the global types
declare global {
  interface Window {
    Core: any;
    documentViewer: any;
    currentAnnotationTool?: string;
    disableAnnotationAutoSave?: boolean;
  }
}

interface AnnotationToolbarProps {
  pdfId: string;
  userRole: string;
  isVisible: boolean;
}

interface ColorOption {
  name: string;
  value: string;
}

const FILL_COLORS: ColorOption[] = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Purple', value: '#800080' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
];

const STROKE_COLORS: ColorOption[] = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Purple', value: '#800080' },
  { name: 'White', value: '#ffffff' },
];

const STROKE_WEIGHTS = [1, 2, 3, 4, 5, 6, 8, 10];

// Font families - AC.3 Free Text
const FONT_FAMILIES = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
];

// Font sizes - AC.3 Free Text
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export default function AnnotationToolbar({ pdfId, userRole, isVisible }: AnnotationToolbarProps) {
  // Hide for viewers (AC.1 Shape & FreeText)
  if (!isVisible || userRole === 'viewer') {
    return null;
  }

  const [selectedTool, setSelectedTool] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<string>('rectangle');
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  
  // Style settings for shapes
  const [fillColor, setFillColor] = useState('#ffff00'); // Yellow default
  const [strokeColor, setStrokeColor] = useState('#000000'); // Black default
  const [strokeWeight, setStrokeWeight] = useState(2);
  const [opacity, setOpacity] = useState(0.5);

  // Style settings for FreeText - AC.3
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [fontSize, setFontSize] = useState(12); // Default 12pt
  const [textColor, setTextColor] = useState('#000000'); // Default black

  // Style settings for FreeText Frame - AC.3
  const [textFrameFillColor, setTextFrameFillColor] = useState('transparent'); 
  const [textFrameStrokeColor, setTextFrameStrokeColor] = useState('transparent'); // Default no border
  const [textFrameStrokeWeight, setTextFrameStrokeWeight] = useState(0); // Default no border

  const dropdownRef = useRef<HTMLDivElement>(null);
  const stylePanelRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowShapeDropdown(false);
      }
      if (stylePanelRef.current && !stylePanelRef.current.contains(event.target as Node)) {
        setShowStylePanel(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Cleanup annotation event listeners
      const viewerElement = document.getElementById('viewer');
      if (viewerElement) {
        viewerElement.removeEventListener('mousedown', handleMouseDown);
        viewerElement.removeEventListener('mousemove', handleMouseMove);
        viewerElement.removeEventListener('mouseup', handleMouseUp);
        viewerElement.removeEventListener('click', handleFreeTextClick);
      }
    };
  }, []);

  // Initialize WebViewer annotation tools
  useEffect(() => {
    if (window.documentViewer && window.Core) {
      const documentViewer = window.documentViewer;
      const annotationManager = documentViewer.getAnnotationManager();
      
      const handleAnnotationSelected = (annotations: any[], action: string) => {
        if (action === 'selected' && annotations.length > 0) {
          const annotation = annotations[0];
          setSelectedAnnotation(annotation);
          setShowStylePanel(true); // Show style panel on selection
          
          // Load current annotation styles
          // Shape styles
          if (annotation.FillColor) {
            setFillColor(annotation.FillColor.toString());
          } else {
             // Default for shapes if no color is set (e.g. new shape)
            setFillColor('#ffff00');
          }

          if (annotation.StrokeColor) {
            setStrokeColor(annotation.StrokeColor.toString());
          } else {
            // Default for shapes if no color is set
            setStrokeColor('#000000');
          }

          if (annotation.StrokeThickness !== undefined) {
            setStrokeWeight(annotation.StrokeThickness);
          } else {
            setStrokeWeight(2);
          }

          if (annotation.Opacity !== undefined) {
            setOpacity(annotation.Opacity);
          } else {
            setOpacity(1); // Default opacity
          }

          // FreeText specific styles - AC.3
          if (annotation instanceof window.Core.Annotations.FreeTextAnnotation) {
            if (annotation.Font) {
              setFontFamily(annotation.Font);
            } else {
              setFontFamily(FONT_FAMILIES[0].value);
            }
            if (annotation.FontSize) {
              setFontSize(parseInt(annotation.FontSize, 10)); // FontSize is like "12pt"
            } else {
              setFontSize(12);
            }
            if (annotation.TextColor) {
              setTextColor(annotation.TextColor.toString());
            } else {
              setTextColor('#000000');
            }

            // FreeText Frame Styles
            // WebViewer uses FillColor for background and StrokeColor for border of FreeText
            if (annotation.FillColor) { // This is background for FreeText
              setTextFrameFillColor(annotation.FillColor.toString());
            } else {
              setTextFrameFillColor('transparent'); // Default: no fill for text box
            }
            if (annotation.StrokeColor) { // This is border for FreeText
              setTextFrameStrokeColor(annotation.StrokeColor.toString());
            } else {
              setTextFrameStrokeColor('transparent'); // Default: no border for text box
            }
            if (annotation.StrokeThickness !== undefined) {
              setTextFrameStrokeWeight(annotation.StrokeThickness);
            } else {
              setTextFrameStrokeWeight(0); // Default: no border
            }
          } else {
            // Reset text-specific styles if a non-freetext annotation is selected
            setFontFamily(FONT_FAMILIES[0].value);
            setFontSize(12);
            setTextColor('#000000');
            setTextFrameFillColor('transparent');
            setTextFrameStrokeColor('transparent');
            setTextFrameStrokeWeight(0);
          }

        } else if (action === 'deselected' || annotations.length === 0) {
          setSelectedAnnotation(null);
          // Optionally hide style panel on deselect: setShowStylePanel(false);
        }
      };

      annotationManager.addEventListener('annotationSelected', handleAnnotationSelected);
      
      return () => {
        annotationManager.removeEventListener('annotationSelected', handleAnnotationSelected);
      };
    }
  }, []);

  // Auto-update selected annotation when style changes
  useEffect(() => {
    if (selectedAnnotation && showStylePanel) {
      // Debounce or throttle this if performance becomes an issue
      updateAnnotationStyle();
    }
  }, [
    fillColor, strokeColor, strokeWeight, opacity, // Shape styles
    fontFamily, fontSize, textColor, // Text styles
    textFrameFillColor, textFrameStrokeColor, textFrameStrokeWeight // Text frame styles
  ]);

  // AC.2: Add shapes to PDF
  const selectShapeTool = (shape: string) => {
    if (!window.documentViewer || !window.Core) return;
    
    setSelectedShape(shape);
    setSelectedTool('shape');
    setShowShapeDropdown(false);
    
    const documentViewer = window.documentViewer;
    const { Annotations } = window.Core;
    
    // Set cursor to crosshair (plus icon equivalent)
    document.body.style.cursor = 'crosshair';
    
    // Clear any existing tool mode and enable annotation creation
    window.currentAnnotationTool = shape;
    
    // Add mouse event listeners to create annotations manually
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
      // Remove any existing listeners
      viewerElement.removeEventListener('mousedown', handleMouseDown);
      viewerElement.removeEventListener('mousemove', handleMouseMove);
      viewerElement.removeEventListener('mouseup', handleMouseUp);
      
      // Add new listeners
      viewerElement.addEventListener('mousedown', handleMouseDown);
      viewerElement.addEventListener('mousemove', handleMouseMove);
      viewerElement.addEventListener('mouseup', handleMouseUp);
    }
  };

  let isDrawing = false;
  let startPoint = { x: 0, y: 0 };
  let currentAnnotation: any = null;

  const handleMouseDown = (e: MouseEvent) => {
    if (!window.documentViewer || !window.Core || !window.currentAnnotationTool) return;
    
    const documentViewer = window.documentViewer;
    const annotationManager = documentViewer.getAnnotationManager();
    const { Annotations } = window.Core;
    
    // Get the viewer element and its bounding rect
    const viewerElement = document.getElementById('viewer');
    if (!viewerElement) return;
    
    const rect = viewerElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Get current page and zoom level
    const currentPage = documentViewer.getCurrentPage();
    const zoomLevel = documentViewer.getZoomLevel();
    
    // Convert to page coordinates (accounting for zoom)
    // This is a simplified conversion - in a real implementation you'd need
    // to account for page positioning, margins, etc.
    const pageX = clientX / zoomLevel;
    const pageY = clientY / zoomLevel;
    
    // Store the starting point
    startPoint = { x: pageX, y: pageY };
    isDrawing = true;
    
    // Create annotation based on selected shape
    let annotation;
    switch (window.currentAnnotationTool) {
      case 'rectangle':
        annotation = new Annotations.RectangleAnnotation();
        break;
      case 'circle':
        annotation = new Annotations.EllipseAnnotation();
        break;
      default:
        annotation = new Annotations.RectangleAnnotation();
    }
    
    // Set initial properties
    annotation.PageNumber = currentPage;
    annotation.X = pageX;
    annotation.Y = pageY;
    annotation.Width = 0;
    annotation.Height = 0;
    
    // Apply current styles for SHAPES
    annotation.FillColor = new Annotations.Color(fillColor);
    annotation.StrokeColor = new Annotations.Color(strokeColor);
    annotation.StrokeThickness = strokeWeight;
    annotation.Opacity = opacity;
    
    // Set additional properties that might be required
    annotation.Author = 'User';
    annotation.Subject = window.currentAnnotationTool === 'rectangle' ? 'Rectangle' : 'Circle';
    annotation.DateCreated = new Date().toISOString();
    annotation.DateModified = new Date().toISOString();
    
    currentAnnotation = annotation;
    
    // Disable auto-save during manual creation
    window.disableAnnotationAutoSave = true;
    
    // Add to annotation manager
    annotationManager.addAnnotation(annotation);
    
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDrawing || !currentAnnotation || !window.documentViewer) return;
    
    const documentViewer = window.documentViewer;
    
    // Get the viewer element and its bounding rect
    const viewerElement = document.getElementById('viewer');
    if (!viewerElement) return;
    
    const rect = viewerElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Get zoom level for coordinate conversion
    const zoomLevel = documentViewer.getZoomLevel();
    
    // Convert to page coordinates
    const pageX = clientX / zoomLevel;
    const pageY = clientY / zoomLevel;
    
    // Update annotation size
    const width = Math.abs(pageX - startPoint.x);
    const height = Math.abs(pageY - startPoint.y);
    const left = Math.min(startPoint.x, pageX);
    const top = Math.min(startPoint.y, pageY);
    
    currentAnnotation.X = left;
    currentAnnotation.Y = top;
    currentAnnotation.Width = width;
    currentAnnotation.Height = height;
    
    // Redraw annotation
    documentViewer.getAnnotationManager().redrawAnnotation(currentAnnotation);
    
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    
    isDrawing = false;
    
    // Ensure minimum size for shapes
    if (currentAnnotation.Width < 10 && (currentAnnotation instanceof window.Core.Annotations.RectangleAnnotation || currentAnnotation instanceof window.Core.Annotations.EllipseAnnotation)) {
      currentAnnotation.Width = 50;
    }
    if (currentAnnotation.Height < 10 && (currentAnnotation instanceof window.Core.Annotations.RectangleAnnotation || currentAnnotation instanceof window.Core.Annotations.EllipseAnnotation)) {
      currentAnnotation.Height = 30;
    }
    
    // Validate annotation before finalizing
    if (currentAnnotation.Width > 0 && currentAnnotation.Height > 0) {
      // Update date modified
      currentAnnotation.DateModified = new Date().toISOString();
      
      // Final redraw
      if (window.documentViewer) {
        window.documentViewer.getAnnotationManager().redrawAnnotation(currentAnnotation);
      }
      
      // Capture annotation data before nullifying currentAnnotation
      const annotationToSave = currentAnnotation; // Keep the full annotation object
      
      // Manually save the annotation
      setTimeout(async () => {
        try {
          const annotationManager = window.documentViewer.getAnnotationManager();
          const xfdfString = await annotationManager.exportAnnotations({ annotList: [annotationToSave] });
          
          const annotationData = {
            xfdf: xfdfString // Changed from xml to xfdf
          };
          
          const response = await fetch(`/api/file/${pdfId}/annotation`, { // POST to create
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(annotationData),
          });
          
          if (response.ok) {
            const result = await response.json();
            // Update the annotation in the viewer with the ID from the backend
            // This ensures that future updates target the correct annotation
            annotationManager.importAnnotations(result.xfdf); // Assuming backend returns the updated xfdf with ID
            // Or, more directly if the backend returns the ID and you want to update the existing annotation object:
            // annotationToSave.Id = result._id; // Ensure your backend returns _id or a suitable identifier
            // annotationManager.redrawAnnotation(annotationToSave); 
            console.log('Shape annotation created with ID:', result._id);
          } else {
            console.error('Error saving shape annotation to backend:', await response.text());
          }
        } catch (error) {
          console.error('Error manually saving shape annotation:', error);
        }
      }, 300); // Delay to allow annotation to be fully drawn
      
    } else {
      // Remove annotation if it has invalid dimensions
      if (window.documentViewer) {
        window.documentViewer.getAnnotationManager().deleteAnnotation(currentAnnotation);
      }
    }
    
    // Re-enable auto-save
    window.disableAnnotationAutoSave = false;
    
    currentAnnotation = null;
    
    e.preventDefault();
    e.stopPropagation();
  };

  // Select free text tool
  const selectFreeTextTool = () => {
    if (!window.documentViewer || !window.Core) return;
    
    setSelectedTool('freetext');
    document.body.style.cursor = 'text';
    
    // Set current tool mode
    window.currentAnnotationTool = 'freetext';
    
    // Add click event listener for free text creation
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
      // Remove any existing listeners
      viewerElement.removeEventListener('mousedown', handleMouseDown);
      viewerElement.removeEventListener('mousemove', handleMouseMove);
      viewerElement.removeEventListener('mouseup', handleMouseUp);
      viewerElement.removeEventListener('click', handleFreeTextClick);
      
      // Add click listener for free text
      viewerElement.addEventListener('click', handleFreeTextClick);
    }
  };

  const handleFreeTextClick = (e: MouseEvent) => {
    if (!window.documentViewer || !window.Core || window.currentAnnotationTool !== 'freetext') return;
    
    const documentViewer = window.documentViewer;
    const annotationManager = documentViewer.getAnnotationManager();
    const { Annotations } = window.Core;
    
    // Get the viewer element and its bounding rect
    const viewerElement = document.getElementById('viewer');
    if (!viewerElement) return;
    
    const rect = viewerElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Get current page and zoom level
    const currentPage = documentViewer.getCurrentPage();
    const zoomLevel = documentViewer.getZoomLevel();
    
    // Convert to page coordinates
    const pageX = clientX / zoomLevel;
    const pageY = clientY / zoomLevel;
    
    // Create free text annotation
    const annotation = new Annotations.FreeTextAnnotation();
    
    // Set all required properties
    annotation.PageNumber = currentPage;
    annotation.X = pageX;
    annotation.Y = pageY;
    annotation.Width = 200 / zoomLevel; // Scale the width based on zoom
    annotation.Height = 50 / zoomLevel; // Scale the height based on zoom
    
    // Set content - AC.2 Free Text
    annotation.setContents('Insert text here'); // Placeholder text
    
    // Apply styles for FreeText - AC.3 & AC.2 (no fill, no border default)
    annotation.TextColor = new Annotations.Color(textColor);
    annotation.Font = fontFamily;
    annotation.FontSize = `${fontSize}pt`;
    
    // Frame styles - AC.2 default: no fill, no border
    annotation.FillColor = new Annotations.Color(textFrameFillColor); // Background
    annotation.StrokeColor = new Annotations.Color(textFrameStrokeColor); // Border
    annotation.StrokeThickness = textFrameStrokeWeight;
    annotation.Opacity = opacity; // Use general opacity for text too, or add separate textOpacity
    
    // Set additional properties that might be required
    annotation.Author = 'User';
    annotation.Subject = 'Free Text';
    annotation.DateCreated = new Date().toISOString();
    annotation.DateModified = new Date().toISOString();
    
    // Disable auto-save during manual creation
    window.disableAnnotationAutoSave = true;
    
    // Add to annotation manager
    annotationManager.addAnnotation(annotation);
    
    // Capture annotation reference to avoid potential null reference issues
    const annotationRef = annotation;
    
    // Manually save the annotation to avoid auto-save serialization issues
    setTimeout(async () => {
      try {
        const annotationManager = window.documentViewer.getAnnotationManager();
        const xfdfString = await annotationManager.exportAnnotations({ annotList: [annotationRef] });

        const annotationData = {
          xfdf: xfdfString // Changed from xml to xfdf
        };
        
        const response = await fetch(`/api/file/${pdfId}/annotation`, { // POST to create
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(annotationData),
        });
        
        if (response.ok) {
          const result = await response.json();
          // annotationRef.Id = result._id; // Store backend ID using captured reference
          // annotationManager.redrawAnnotation(annotationRef);
          annotationManager.importAnnotations(result.xfdf); // Assuming backend returns updated xfdf with ID
          console.log('FreeText annotation created with ID:', result._id);
        } else {
          console.error('Error saving freetext annotation to backend:', await response.text());
        }
        
        // Re-enable auto-save
        window.disableAnnotationAutoSave = false;
      } catch (error) {
        console.error('Error manually saving freetext annotation:', error);
        // Re-enable auto-save even on error
        window.disableAnnotationAutoSave = false;
      }
    }, 300);
    
    e.preventDefault();
    e.stopPropagation();
  };

  // Reset to pan tool
  const resetTool = () => {
    if (!window.documentViewer) return;
    
    setSelectedTool('');
    document.body.style.cursor = 'default';
    
    // Clear current tool
    window.currentAnnotationTool = undefined;
    
    // Remove all event listeners
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
      viewerElement.removeEventListener('mousedown', handleMouseDown);
      viewerElement.removeEventListener('mousemove', handleMouseMove);
      viewerElement.removeEventListener('mouseup', handleMouseUp);
      viewerElement.removeEventListener('click', handleFreeTextClick);
    }
  };

  // AC.3: Customize shapes
  const updateAnnotationStyle = () => {
    if (!selectedAnnotation || !window.documentViewer || !window.Core) return;
    
    const { Annotations, Color } = window.Core;
    const documentViewer = window.documentViewer;
    const annotationManager = documentViewer.getAnnotationManager();
    
    // Update common properties
    selectedAnnotation.Opacity = opacity;

    if (selectedAnnotation instanceof Annotations.FreeTextAnnotation) {
      // FreeText specific styles - AC.3
      selectedAnnotation.Font = fontFamily;
      selectedAnnotation.FontSize = `${fontSize}pt`;
      selectedAnnotation.TextColor = new Color(textColor);
      
      // Frame styles for FreeText
      selectedAnnotation.FillColor = new Color(textFrameFillColor); // Background
      selectedAnnotation.StrokeColor = new Color(textFrameStrokeColor); // Border Color
      selectedAnnotation.StrokeThickness = textFrameStrokeWeight; // Border Weight

    } else if (
      selectedAnnotation instanceof Annotations.RectangleAnnotation ||
      selectedAnnotation instanceof Annotations.EllipseAnnotation
      // Add other shape types here if needed
    ) {
      // Shape specific styles - AC.3 Shape
      selectedAnnotation.FillColor = new Color(fillColor);
      selectedAnnotation.StrokeColor = new Color(strokeColor);
      selectedAnnotation.StrokeThickness = strokeWeight;
    }
        
    // Refresh the annotation
    annotationManager.redrawAnnotation(selectedAnnotation);
    
    // Save annotation changes
    saveAnnotationChanges(selectedAnnotation);
  };

  // AC.4: Remove shapes/text
  const deleteSelectedAnnotation = () => {
    if (!selectedAnnotation || !window.documentViewer) return;
    
    const documentViewer = window.documentViewer;
    const annotationManager = documentViewer.getAnnotationManager();
    
    annotationManager.deleteAnnotation(selectedAnnotation);
    setSelectedAnnotation(null);
    setShowStylePanel(false);
    
    // Save changes to backend
    deleteAnnotationFromBackend(selectedAnnotation);
  };

  // Save annotation changes to backend
  const saveAnnotationChanges = async (annotation: any) => {
    if (!annotation || !annotation.Id || !window.documentViewer) { // Ensure annotation has an ID for update
      console.warn('Attempted to save annotation without an ID or viewer not ready.', annotation);
      return;
    }

    try {
      const annotationManager = window.documentViewer.getAnnotationManager();
      // Export only the specific annotation that was changed
      const xfdfString = await annotationManager.exportAnnotations({ annotList: [annotation] });
      
      const annotationData = {
        xfdf: xfdfString // Changed from xml to xfdf
      };

      // Update existing annotation using PUT
      const response = await fetch(`/api/file/${pdfId}/annotation/${annotation.Id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        console.error('Error updating annotation on backend:', await response.text());
      } else {
        console.log('Annotation updated successfully:', annotation.Id);
      }
      
    } catch (error) {
      console.error('Error saving annotation changes:', error);
    }
  };

  // Delete annotation from backend
  const deleteAnnotationFromBackend = async (annotation: any) => {
    try {
      if (annotation.Id) {
        await fetch(`/api/file/${pdfId}/annotation/${annotation.Id}`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  // Get shape icon
  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case 'rectangle':
        return <MdRectangle size={16} />;
      case 'circle':
        return <MdCircle size={16} />;
      default:
        return <FaSquare size={16} />;
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-center px-4 py-3">
        <div className="flex items-center space-x-4">
          
          {/* Shape Panel */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center">
              <button
                onClick={() => selectShapeTool(selectedShape)}
                className={`px-4 py-2 rounded-l-md border border-r-0 ${
                  selectedTool === 'shape' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Shape Tool"
              >
                <div className="flex items-center space-x-2">
                  {getShapeIcon(selectedShape)}
                  <span>Shape</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowShapeDropdown(!showShapeDropdown)}
                className={`px-2 py-2 rounded-r-md border ${
                  selectedTool === 'shape' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                }`}
                title="Shape Options"
              >
                <FaChevronDown size={12} />
              </button>
            </div>
            
            {showShapeDropdown && (
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="p-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Select Shape</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => selectShapeTool('rectangle')}
                      className={`p-2 rounded flex items-center space-x-2 ${
                        selectedShape === 'rectangle' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <MdRectangle size={16} />
                      <span className="text-sm">Rectangle</span>
                    </button>
                    <button
                      onClick={() => selectShapeTool('circle')}
                      className={`p-2 rounded flex items-center space-x-2 ${
                        selectedShape === 'circle' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <MdCircle size={16} />
                      <span className="text-sm">Circle</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Free Text Panel */}
          <button
            onClick={selectFreeTextTool}
            className={`px-4 py-2 rounded-md border ${
              selectedTool === 'freetext' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
            title="Free Text Tool"
          >
            <div className="flex items-center space-x-2">
              <FaFont size={16} />
              <span>Free Text</span>
            </div>
          </button>

          {/* Style Panel Button */}
          <button
            onClick={() => setShowStylePanel(!showStylePanel)}
            className={`px-4 py-2 rounded-md border ${
              showStylePanel 
                ? 'bg-green-500 text-white border-green-500' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
            title="Style Panel"
          >
            <div className="flex items-center space-x-2">
              <FaPalette size={16} />
              <span>Style</span>
            </div>
          </button>

          {/* Delete Button - only show when annotation is selected */}
          {selectedAnnotation && (
            <button
              onClick={deleteSelectedAnnotation}
              className="px-4 py-2 rounded-md border border-red-300 bg-red-100 hover:bg-red-200 text-red-700"
              title="Delete Selected Annotation"
            >
              <div className="flex items-center space-x-2">
                <FaTrash size={16} />
                <span>Delete</span>
              </div>
            </button>
          )}

          {/* Reset/Pan Tool */}
          <button
            onClick={resetTool}
            className={`px-4 py-2 rounded-md border ${
              selectedTool === '' 
                ? 'bg-gray-300 text-gray-700 border-gray-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
            title="Pan Tool (Reset)"
          >
            <span>Pan</span>
          </button>
        </div>
      </div>

      {/* Style Panel - AC.3 Shape & FreeText */}
      {selectedAnnotation && showStylePanel && ( // Only show if an annotation is selected
        <div 
          ref={stylePanelRef}
          className="absolute bottom-full right-4 mb-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50" // Increased width
        >
          <div className="text-sm font-medium text-gray-700 mb-3">Annotation Style</div>
          
          {/* Common Opacity Control */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05" // Finer control
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
          
          {/* Conditional rendering for Shape Styles */}
          {selectedAnnotation && (selectedAnnotation instanceof window.Core.Annotations.RectangleAnnotation || selectedAnnotation instanceof window.Core.Annotations.EllipseAnnotation) && (
            <>
              {/* Fill Color - AC.3 Shape */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fill Color (Shape)</label>
                <div className="grid grid-cols-9 gap-1">
                  {FILL_COLORS.map((color) => (
                    <button
                      key={`fill-${color.value}`}
                      onClick={() => setFillColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        fillColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ 
                        backgroundColor: color.value === 'transparent' ? 'transparent' : color.value,
                        backgroundImage: color.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: color.value === 'transparent' ? '8px 8px' : 'auto',
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Color - AC.3 Shape */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Stroke Color (Shape)</label>
                <div className="grid grid-cols-8 gap-1">
                  {STROKE_COLORS.map((color) => (
                    <button
                      key={`stroke-${color.value}`}
                      onClick={() => setStrokeColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        strokeColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Weight - AC.3 Shape */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Stroke Weight (Shape)</label>
                <select
                  value={strokeWeight}
                  onChange={(e) => setStrokeWeight(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {STROKE_WEIGHTS.map((weight) => (
                    <option key={`stroke-weight-${weight}`} value={weight}>{weight}px</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Conditional rendering for FreeText Styles - AC.3 FreeText */}
          {selectedAnnotation && selectedAnnotation instanceof window.Core.Annotations.FreeTextAnnotation && (
            <>
              {/* Font Family, Size, Color */}
              <div className="grid grid-cols-2 gap-x-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {FONT_FAMILIES.map(font => (
                      <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {FONT_SIZES.map(size => (
                      <option key={size} value={size}>{size}pt</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
                 <div className="grid grid-cols-8 gap-1">
                  {STROKE_COLORS.map((color) => ( // Re-using STROKE_COLORS for text, add more if needed
                    <button
                      key={`text-${color.value}`}
                      onClick={() => setTextColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        textColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Text Frame Styling */}
              <div className="text-xs font-medium text-gray-600 mt-3 mb-1">Text Frame Style</div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fill Color (Text Background)</label>
                <div className="grid grid-cols-9 gap-1">
                  {FILL_COLORS.map((color) => (
                    <button
                      key={`text-fill-${color.value}`}
                      onClick={() => setTextFrameFillColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        textFrameFillColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ 
                        backgroundColor: color.value === 'transparent' ? 'transparent' : color.value,
                        backgroundImage: color.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: color.value === 'transparent' ? '8px 8px' : 'auto',
                       }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Border Color (Text Frame)</label>
                <div className="grid grid-cols-8 gap-1">
                   {STROKE_COLORS.map((color) => (
                    <button
                      key={`text-border-${color.value}`}
                      onClick={() => setTextFrameStrokeColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        textFrameStrokeColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Border Weight (Text Frame)</label>
                <select
                  value={textFrameStrokeWeight}
                  onChange={(e) => setTextFrameStrokeWeight(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {[0, ...STROKE_WEIGHTS].map((weight) => ( // Add 0 for no border
                    <option key={`text-border-weight-${weight}`} value={weight}>{weight}px</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 