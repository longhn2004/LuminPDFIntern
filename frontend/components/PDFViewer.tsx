"use client"
import { HTTP_STATUS } from "@/libs/constants/httpStatus";
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PermissionDialog from './PermissionDialog';
import PDFToolbar from './PDFToolbar';
import PDFViewerCore from './PDFViewerCore';

interface PDFViewerProps {
    pdfId: string;
}

export default function PDFViewer({pdfId}: PDFViewerProps) {
  const router = useRouter();
  const [fileName, setFileName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [listUsers, setListUsers] = useState<{ id: string, email: string, role: string, name: string }[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(true);

  const fetchListUsers = async () => {
    try {
      console.log("PDFViewer: Fetching user list for:", pdfId);
      const response = await fetch(`/api/file/${pdfId}/users`);
      if (response.status === HTTP_STATUS.FORBIDDEN) {
        setIsOwner(false);
        return;
      }
      const data = await response.json();
      setIsOwner(true);
      setListUsers(data);
    } catch (error) {
      console.error("PDFViewer: Error fetching user list:", error);
      toast.error("Failed to load permissions");
    }
  }

  const fetchFileInfo = async () => {
    setIsFileLoading(true);
    try {
      console.log("PDFViewer: Fetching file info for:", pdfId);
      const response = await fetch(`/api/file/${pdfId}/info`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file info: ${response.status}`);
      }
      const data = await response.json();
      setFileName(data.name || "Untitled Document");
    } catch (error) {
      console.error("PDFViewer: Error fetching file info:", error);
      toast.error("Failed to load document info");
      setFileName("Untitled Document");
    } finally {
      setIsFileLoading(false);
    }
  }

  useEffect(() => {
    console.log("PDFViewer: Component mounted/updated for pdfId:", pdfId);
    fetchFileInfo();
    fetchListUsers();
  }, [pdfId]);

  const downloadFile = async () => {
    try {
      toast.info("Preparing download...");
      const downloadUrl = `/api/file/${pdfId}/download`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      const blob = await response.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      console.error("PDFViewer: Error downloading file:", error);
      toast.error("Failed to download document");
    }
  }

  const deleteFile = async () => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }
    
    try {
      toast.info("Deleting document...");
      const response = await fetch(`/api/file/${pdfId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }
      
      await response.json();
      toast.success("Document deleted successfully");
      router.push('/dashboard/document-list');
    } catch (error) {
      console.error("PDFViewer: Error deleting file:", error);
      toast.error("Failed to delete document");
    }
  }
  
  return (
    <div className="max-w-full text-black bg-white flex flex-col h-full min-h-0">
      <ToastContainer position="bottom-right" />
      
      <div className="flex-1 min-h-0 text-black bg-white flex flex-col">
        <PDFToolbar 
          fileName={fileName}
          isOwner={isOwner}
          onNavigateBack={() => router.push('/dashboard/document-list')}
          onDelete={deleteFile}
          onDownload={downloadFile}
          onShare={() => setShowPermissionDialog(true)}
        />
        
        {isFileLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl font-semibold mb-2">Loading document information...</h1>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <PDFViewerCore pdfId={pdfId} />
        )}
      </div>

      <PermissionDialog 
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        fileName={fileName}
        pdfId={pdfId}
        listUsers={listUsers}
        fetchListUsers={fetchListUsers}
      />
    </div>
  );
}