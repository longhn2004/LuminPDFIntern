"use client"
import PDFViewer from '@/components/PDFViewer';
import { useParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function Page() {
  const params = useParams();
  const pdfId = params.id;
  return (
    <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
      <DashboardHeader />
      <PDFViewer pdfId={pdfId as string} />
    </div>
  )
}