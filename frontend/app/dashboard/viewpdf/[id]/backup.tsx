"use client"
import Script from "next/script";
import { useEffect, useRef, useState } from 'react'
import { useParams } from "next/navigation";
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

export default function Page() {
  const params = useParams();
  const pdfId = params.id;

  // make this page reload when the pdfId changes
  // const isLoadedCoreRef = useRef<boolean>(null);
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
  <div className="max-h-screen text-black bg-white flex flex-col">
    <h1>Test</h1>
    {!isLoaded && <h1>Loading...</h1>}
    {isLoaded && <div className="max-h-screen text-black bg-white flex flex-col overflow-scroll">
      <Script src="/webviewer/core/webviewer-core.min.js" onLoad={() => setIsLoadedWebViewer(true)}/>
      {isLoadedWebViewer && <Script src="/webviewer/core/pdf/PDFNet.js"  onLoad={() => setIsLoadedPdfNet(true)}/>}
      <div className='webviewer' id="scroll-view" style={{ height: '100vh' }}>
        <div id="viewer" />
      </div>
    </div>}
  </div>)
}

// import { useEffect, useRef } from 'react';
// import { useParams } from 'next/navigation';

// export default function WebViewer() {

//   const params = useParams();
//   const fileId = params.id;

//     const viewer = useRef<HTMLDivElement | null>(null);

//     useEffect(() => {
//       import('@pdftron/webviewer').then((module) => {
//         const WebViewer = module.default;
//         WebViewer(
//           {
//             path: '/webviewer',
//             licenseKey: process.env.NEXT_APP_PDFTRON_LICENSE_KEY,
//             // initialDoc: 'https://apryse.s3.amazonaws.com/public/files/samples/WebviewerDemoDoc.pdf',
//           },
//           viewer.current as HTMLElement,
//         ).then((instance) => {
//             const { documentViewer } = instance.Core;

//             documentViewer.loadDocument(`/api/file/${fileId}/download`);

//             documentViewer.addEventListener('documentLoaded', () => {
//               console.log('Document loaded');
//             });
//             // you can now call WebViewer APIs here...
//           });
//       })
//     }, []);


//     return (
//       <div className="max-h-screen text-black bg-white">
//         <h1>Test</h1>
//         {viewer && <div className="webviewer" ref={viewer} style={{height: "100vh"}}></div>}  
//       </div>
      
//     );
  
// }