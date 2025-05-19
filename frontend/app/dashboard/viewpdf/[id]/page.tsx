"use client"
import Script from "next/script";
import { useEffect, useRef, useState } from 'react'

async function initCore(licenseKey: string) {
  window.Core.setWorkerPath('/webviewer/core');

  const documentViewer = new window.Core.DocumentViewer();

  // Hook up the DocumentViewer object to your own elements
  documentViewer.setScrollViewElement(document.getElementById('scroll-view'));
  documentViewer.setViewerElement(document.getElementById('viewer'));

  // Load your document
  documentViewer.loadDocument('https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo.pdf', { l: process.env.NEXT_APP_PDFTRON_LICENSE_KEY });
}

export default function Page() {
  const isLoadedCoreRef = useRef<boolean>(null);
  const [isLoadedWebViewer, setIsLoadedWebViewer] = useState(false);
  const [isLoadedPdfNet, setIsLoadedPdfNet] = useState(false);
  useEffect(() => {
    if (window.Core && !isLoadedCoreRef.current && isLoadedWebViewer && isLoadedPdfNet) {
      isLoadedCoreRef.current = true;
      initCore('license key');
    }
  }, );
  return <div className="max-h-screen text-black bg-white flex flex-col">
    <Script src="/webviewer/core/webviewer-core.min.js" onLoad={() => setIsLoadedWebViewer(true)}/>
    {isLoadedWebViewer && <Script src="/webviewer/core/pdf/PDFNet.js"  onLoad={() => setIsLoadedPdfNet(true)}/>}
    <div className='webviewer' id="scroll-view" style={{ height: '100vh' }}>
      <div id="viewer" />
    </div>
  </div>
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