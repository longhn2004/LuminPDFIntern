"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

function initCore(licenseKey: string, viewerElement: HTMLDivElement) {
  window.Core.setWorkerPath("/webviewer/core");

  const documentViewer = new window.Core.DocumentViewer();
  documentViewer.setScrollViewElement(document.getElementById("scroll-view"));
  documentViewer.setViewerElement(viewerElement);

  const { Annotations, AnnotationManager } = window.Core;
  const annotationManager = documentViewer.getAnnotationManager();

  // Load document
  const documentUrl = "https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo.pdf";
  documentViewer.loadDocument(documentUrl, { l: licenseKey });

  // Function to load annotations from an XFDF string or file
  const loadAnnotations = async () => {
    try {
      // Example: Fetch XFDF from a server or file
      // Replace with your actual endpoint or XFDF source
      const response = await fetch("/api/file/682ec269cf3ad68a493b6309/annotation");
      const xfdfData = await response.text();

      // Import annotations into the viewer
      if (xfdfData) {
        await annotationManager.importAnnotations(xfdfData);
        // Redraw all annotations
        annotationManager.drawAnnotationsFromList(annotationManager.getAnnotationsList());
        console.log("Annotations loaded successfully");
      } else {
        console.log("No annotations found for this document");
      }
    } catch (error) {
      console.error("Error loading annotations:", error);
    }
  };

  // Listen for documentLoaded event to load annotations
  documentViewer.addEventListener("documentLoaded", () => {
    console.log("Document loaded, fetching annotations...");
    loadAnnotations();
  });

  // Function to add a Free Text Annotation
  const addFreeTextAnnotation = () => {
    const freeText = new Annotations.FreeTextAnnotation();
    freeText.PageNumber = 1;
    freeText.X = 100;
    freeText.Y = 100;
    freeText.Width = 200;
    freeText.Height = 50;
    freeText.setContents("Sample Free Text");
    freeText.FontSize = "14pt";
    freeText.StrokeColor = new Annotations.Color(255, 0, 0);
    freeText.TextColor = new Annotations.Color(0, 0, 0);

    annotationManager.addAnnotation(freeText);
    annotationManager.redrawAnnotation(freeText);
  };

  // Function to add a Rectangle Annotation
  const addRectangleAnnotation = () => {
    const rectangle = new Annotations.RectangleAnnotation();
    rectangle.PageNumber = 1;
    rectangle.X = 300;
    rectangle.Y = 300;
    rectangle.Width = 100;
    rectangle.Height = 100;
    rectangle.StrokeColor = new Annotations.Color(0, 255, 0);
    rectangle.StrokeThickness = 2;

    annotationManager.addAnnotation(rectangle);
    annotationManager.redrawAnnotation(rectangle);
  };

  // Function to delete selected annotations
  const deleteSelectedAnnotations = () => {
    const selectedAnnotations = annotationManager.getSelectedAnnotations();
    if (selectedAnnotations.length > 0) {
      annotationManager.deleteAnnotations(selectedAnnotations);
    } else {
      alert("No annotations selected!");
    }
  };

  // Function to edit an annotation
  const editAnnotation = () => {
    const selectedAnnotations = annotationManager.getSelectedAnnotations();
    if (selectedAnnotations.length === 1) {
      const annotation = selectedAnnotations[0];
      if (annotation instanceof Annotations.FreeTextAnnotation) {
        annotation.setContents("Edited Free Text");
        annotation.FontSize = "16pt";
        annotation.TextColor = new Annotations.Color(0, 0, 255);
      } else if (annotation instanceof Annotations.RectangleAnnotation) {
        annotation.Width = 150;
        annotation.Height = 150;
        annotation.StrokeColor = new Annotations.Color(255, 165, 0);
      }
      annotationManager.redrawAnnotation(annotation);
    } else {
      alert("Select exactly one annotation to edit!");
    }
  };
  // Optional: Save annotations when they change
  annotationManager.addEventListener("annotationChanged", async (annotations: any[], action: string) => {
    if (action === "add" || action === "modify" || action === "delete") {
      const xfdf = await annotationManager.exportAnnotations();
      // Example: Save XFDF to server
      await fetch("/api/save-annotations", {
        method: "POST",
        body: JSON.stringify({ documentId: "webviewer-demo.pdf", xfdf }),
        headers: { "Content-Type": "application/json" },
      });
      console.log("Annotations saved:", xfdf);
    }
  });

  // Enable annotation tools
  documentViewer.setToolMode(documentViewer.getTool(window.Core.Tools.ToolNames.FREETEXT));

  return {
    addFreeTextAnnotation,
    addRectangleAnnotation,
    deleteSelectedAnnotations,
    editAnnotation,
  };
}

export default function Page() {
  const isLoadedCoreRef = useRef<boolean>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoadedWebViewer, setIsLoadedWebViewer] = useState(false);
  const [isLoadedPdfNet, setIsLoadedPdfNet] = useState(false);
  const [annotationControls, setAnnotationControls] = useState<any>(null);

  useEffect(() => {
    if (window.Core && !isLoadedCoreRef.current && isLoadedWebViewer && isLoadedPdfNet && viewerRef.current) {
      isLoadedCoreRef.current = true;
      const controls = initCore("your-license-key", viewerRef.current);
      setAnnotationControls(controls);
    }
  }, [isLoadedWebViewer, isLoadedPdfNet]);

  return (
    <>
      <Script
        src="/webviewer/core/webviewer-core.min.js"
        onLoad={() => setIsLoadedWebViewer(true)}
      />
      {isLoadedWebViewer && (
        <Script
          src="/webviewer/core/pdf/PDFNet.js"
          onLoad={() => setIsLoadedPdfNet(true)}
        />
      )}
      <div className="webviewer" id="scroll-view" style={{ height: "100vh" }}>
        <div id="viewer" ref={viewerRef} />
        {annotationControls && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000 }}>
            <button onClick={annotationControls.addFreeTextAnnotation}>
              Add Free Text
            </button>
            <button onClick={annotationControls.addRectangleAnnotation}>
              Add Rectangle
            </button>
            <button onClick={annotationControls.deleteSelectedAnnotations}>
              Delete Selected
            </button>
            <button onClick={annotationControls.editAnnotation}>Edit Selected</button>
          </div>
        )}
      </div>
    </>
  );
}