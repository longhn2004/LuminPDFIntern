import React, { useState, useEffect } from 'react';

interface AnnotationPanelProps {
  pdfId: string;
  annotationManager: any;
  documentViewer: any;
  userRole: string;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  pdfId,
  annotationManager,
  documentViewer,
  userRole,
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);

  useEffect(() => {
    console.log('AnnotationPanel: Mounted with props:', { pdfId, userRole, hasAnnotationManager: !! !!annotationManager, hasDocumentViewer: !! !!documentViewer });
  }, []);

  const Annotations = window.Core?.Annotations;
  const Tools = window.Core?.Tools;

  if (!Annotations || !Tools) {
    console.error('AnnotationPanel: window.Core.Annotations or window.Core.Tools is not available');
    return null;
  }

  useEffect(() => {
    const handleSelection = () => {
      const selected = annotationManager.getSelectedAnnotations();
      setSelectedAnnotation(selected.length === 1 ? selected[0] : null);
      setShowStylePanel(selected.length === 1);
      console.log('AnnotationPanel: Annotation selected:', selected.length > 0 ? selected[0] : 'None');
    };
    annotationManager.addEventListener('annotationSelected', handleSelection);
    return () => {
      annotationManager.removeEventListener('annotationSelected', handleSelection);
    };
  }, [annotationManager]);

  const addShape = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.RECTANGLE));
    console.log('AnnotationPanel: Add Shape triggered');
  };

  const addFreeText = () => {
    documentViewer.setToolMode(documentViewer.getTool(Tools.ToolNames.FREETEXT));
    const tool = documentViewer.getTool(Tools.ToolNames.FREETEXT);
    tool.setStyles({
      StrokeThickness: 0,
      FillColor: new Annotations.Color(0, 0, 0, 0),
      TextColor: new Annotations.Color(0, 0, 0),
      FontSize: '12pt',
    });
    annotationManager.addEventListener('annotationChanged', (annotations: any[], action: any) => {
      if (action === 'add' && annotations[0] instanceof Annotations.FreeTextAnnotation) {
        annotations[0].setContents('[Insert text here]');
        annotationManager.updateAnnotation(annotations[0]);
        console.log('AnnotationPanel: FreeText annotation added with placeholder');
      }
    }, { once: true });
    console.log('AnnotationPanel: Add FreeText triggered');
  };

  const deleteAnnotation = () => {
    if (selectedAnnotation) {
      annotationManager.deleteAnnotation(selectedAnnotation);
      setSelectedAnnotation(null);
      setShowStylePanel(false);
      console.log('AnnotationPanel: Annotation deleted');
    }
  };

  const updateStyles = (styles: any) => {
    if (!selectedAnnotation) return;
    if (selectedAnnotation instanceof Annotations.RectangleAnnotation) {
      annotationManager.setAnnotationStyles(selectedAnnotation, {
        FillColor: styles.fillColor || selectedAnnotation.FillColor,
        StrokeColor: styles.strokeColor || selectedAnnotation.StrokeColor,
        StrokeThickness: styles.strokeWeight || selectedAnnotation.StrokeThickness,
        Opacity: styles.opacity ?? selectedAnnotation.Opacity,
      });
    } else if (selectedAnnotation instanceof Annotations.FreeTextAnnotation) {
      annotationManager.setAnnotationRichTextStyle(selectedAnnotation, {
        fontFamily: styles.fontFamily || selectedAnnotation.getCustomData('fontFamily') || 'Arial',
        fontSize: styles.fontSize || selectedAnnotation.FontSize,
        color: styles.textColor || selectedAnnotation.TextColor,
      });
      annotationManager.setAnnotationStyles(selectedAnnotation, {
        FillColor: styles.fillColor || selectedAnnotation.FillColor,
        StrokeColor: styles.strokeColor || selectedAnnotation.StrokeColor,
        StrokeThickness: styles.strokeWeight || selectedAnnotation.StrokeThickness,
        Opacity: styles.opacity ?? selectedAnnotation.Opacity,
      });
      selectedAnnotation.setCustomData('fontFamily', styles.fontFamily || 'Arial');
    }
    annotationManager.updateAnnotation(selectedAnnotation);
    console.log('AnnotationPanel: Styles updated:', styles);
  };

  if (userRole == 'viewer') {
    console.log('AnnotationPanel: Not rendering because userRole is not editor:', userRole);
    return null;
  }

  return (
    <div className="fixed bottom-15 right-20 bg-white p-4 border border-gray-300 rounded-lg shadow-lg z-[1000] flex gap-2">
      <button 
        onClick={addShape}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Add Shape
      </button>
      <button 
        onClick={addFreeText}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Add Free Text
      </button>
      {selectedAnnotation && (
        <button 
          onClick={deleteAnnotation}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      )}
      {showStylePanel && (
        <div className="absolute top-full left-0 mt-2 bg-white p-4 border border-gray-300 rounded-lg shadow-lg flex flex-col gap-2">
          {selectedAnnotation instanceof Annotations.RectangleAnnotation && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Fill Color:</label>
                <input
                  type="color"
                  defaultValue={selectedAnnotation.FillColor.toHexString()}
                  onChange={(e) => updateStyles({ fillColor: new Annotations.Color(e.target.value) })}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Stroke Color:</label>
                <input
                  type="color"
                  defaultValue={selectedAnnotation.StrokeColor.toHexString()}
                  onChange={(e) => updateStyles({ strokeColor: new Annotations.Color(e.target.value) })}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Stroke Weight:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue={selectedAnnotation.StrokeThickness}
                  onChange={(e) => updateStyles({ strokeWeight: parseInt(e.target.value) })}
                  className="w-16 p-1 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Opacity:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue={selectedAnnotation.Opacity}
                  onChange={(e) => updateStyles({ opacity: parseFloat(e.target.value) })}
                  className="w-24"
                />
              </div>
            </>
          )}
          {selectedAnnotation instanceof Annotations.FreeTextAnnotation && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Font Family:</label>
                <select
                  defaultValue={selectedAnnotation.getCustomData('fontFamily') || 'Arial'}
                  onChange={(e) => updateStyles({ fontFamily: e.target.value })}
                  className="p-1 border rounded"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Font Size:</label>
                <input
                  type="number"
                  min="8"
                  max="36"
                  defaultValue={parseInt(selectedAnnotation.FontSize)}
                  onChange={(e) => updateStyles({ fontSize: `${e.target.value}pt` })}
                  className="w-16 p-1 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Text Color:</label>
                <input
                  type="color"
                  defaultValue={selectedAnnotation.TextColor.toHexString()}
                  onChange={(e) => updateStyles({ textColor: new Annotations.Color(e.target.value) })}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Fill Color:</label>
                <input
                  type="color"
                  defaultValue={selectedAnnotation.FillColor?.toHexString() || '#00000000'}
                  onChange={(e) => updateStyles({ fillColor: new Annotations.Color(e.target.value) })}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Border Color:</label>
                <input
                  type="color"
                  defaultValue={selectedAnnotation.StrokeColor?.toHexString() || '#000000'}
                  onChange={(e) => updateStyles({ strokeColor: new Annotations.Color(e.target.value) })}
                  className="w-10 h-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Border Weight:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={selectedAnnotation.StrokeThickness || 0}
                  onChange={(e) => updateStyles({ strokeWeight: parseInt(e.target.value) })}
                  className="w-16 p-1 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Opacity:</label>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue={selectedAnnotation.Opacity}
                  onChange={(e) => updateStyles({ opacity: parseFloat(e.target.value) })}
                  className="w-24"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;