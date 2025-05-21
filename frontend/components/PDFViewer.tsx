"use client"
import Script from "next/script";
import { useEffect, useRef, useState } from 'react'
async function initCore(pdfId: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  window.Core.setWorkerPath('/webviewer/core');

  const documentViewer = new window.Core.DocumentViewer();

  // Hook up the DocumentViewer object to your own elements
  documentViewer.setScrollViewElement(document.getElementById('scroll-view'));
  documentViewer.setViewerElement(document.getElementById('viewer'));

  // Load your document
  documentViewer.loadDocument(`/api/file/${pdfId}/download`, { l: process.env.NEXT_APP_PDFTRON_LICENSE_KEY });
}

interface PDFViewerProps {
    pdfId: string;
}

export default function Page({pdfId}: PDFViewerProps) {
  const [isLoadedCoreRef, setIsLoadedCoreRef] = useState(false);
  const [isLoadedWebViewer, setIsLoadedWebViewer] = useState(false);
  const [isLoadedPdfNet, setIsLoadedPdfNet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    if (!isLoadedCoreRef && isLoadedWebViewer && isLoadedPdfNet) {
      setIsLoadedCoreRef(true);
      initCore(pdfId as string);
      setIsLoaded(true);
      
    }

    setIsLoadedWebViewer(true);
    setIsLoadedPdfNet(true);
  }, );
  return (
  <div className="max-w-full text-black bg-white flex flex-col">
    {!isLoaded && <h1>Loading...</h1>}
    {isLoaded && <div className="h-full text-black bg-white flex flex-col overflow-y-scroll">
      <Script src="/webviewer/core/webviewer-core.min.js" onLoad={() => setIsLoadedWebViewer(true)}/>
      {isLoadedWebViewer && <Script src="/webviewer/core/pdf/PDFNet.js"  onLoad={() => setIsLoadedPdfNet(true)}/>}
      <div className='webviewer' id="scroll-view" style={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div id="viewer" />
      </div>
    </div>}
  </div>)
}