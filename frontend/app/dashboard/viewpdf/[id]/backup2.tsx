"use client"
import Script from "next/script";
import { useEffect, useRef, useState } from 'react'
import PDFViewer from '@/components/PDFViewer';
import { useParams } from 'next/navigation';


export default function Page() {
  const params = useParams();
  const pdfId = params.id;
  return (
    // <div className="max-h-screen text-black bg-white flex flex-col">
      <PDFViewer pdfId={pdfId as string} />
    // </div>
  )
}