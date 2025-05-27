"use client"
import { HTTP_STATUS } from "@/libs/constants/httpStatus";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PermissionDialog from './PermissionDialog';
import PDFToolbar from './PDFToolbar';
import PDFViewerCore from './PDFViewerCore';
import NotFoundPage from './NotFoundPage';
import UnauthorizedPage from './UnauthorizedPage';

interface PDFViewerProps {
    pdfId: string;
}

export default function PDFViewer({pdfId}: PDFViewerProps) {
  const router = useRouter();
  const [fileName, setFileName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [listUsers, setListUsers] = useState<{ id: string, email: string, role: string, name: string }[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [unauthorizedError, setUnauthorizedError] = useState(false);

  const fetchListUsers = useCallback(async () => {
    try {
      console.log("PDFViewer: Fetching user list for:", pdfId);
      const response = await fetch(`/api/file/${pdfId}/users`);
      if (response.status === HTTP_STATUS.FORBIDDEN) {
        setIsOwner(false);
        return;
      }
      if (!response.ok) {
        console.error("PDFViewer: Failed to fetch user list:", response.statusText);
        toast.error("Could not load sharing information.");
        return;
      }
      const data = await response.json();
      setIsOwner(true);
      setListUsers(data);
    } catch (error) {
      console.error("PDFViewer: Error fetching user list:", error);
      toast.error("Failed to load permissions information");
    }
  }, [pdfId]);

  const fetchUserRole = useCallback(async (): Promise<string | null> => {
    try {
      console.log("PDFViewer: Fetching user role for:", pdfId);
      const response = await fetch(`/api/file/${pdfId}/user-role`);
      if (!response.ok) {
        if (response.status === HTTP_STATUS.NOT_FOUND) {
          setNotFoundError(true);
          return null;
        }
        if (response.status === HTTP_STATUS.FORBIDDEN) {
          setUnauthorizedError(true);
          return null;
        }
        setUnauthorizedError(true);
        return null;
      }
      const data = await response.json();
      setUserRole(data.role);
      console.log("PDFViewer: User role:", data.role);
      if (!data.role) {
        setUnauthorizedError(true);
        return null;
      }
      if (data.role === 'owner') {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
      return data.role;
    } catch (error) {
      console.error("PDFViewer: Error fetching user role:", error);
      toast.error("Could not determine your permissions for this document.");
      setUnauthorizedError(true);
      return null;
    }
  }, [pdfId]);

  const fetchFileInfo = useCallback(async (): Promise<boolean> => {
    try {
      console.log("PDFViewer: Fetching file info for:", pdfId);
      const response = await fetch(`/api/file/${pdfId}/info`);
      if (!response.ok) {
        if (response.status === HTTP_STATUS.NOT_FOUND) {
          setNotFoundError(true);
          return false;
        }
        if (response.status === HTTP_STATUS.FORBIDDEN) {
          setUnauthorizedError(true);
          return false;
        }
        toast.error("Failed to load document information. The document may not exist or there was a server issue.");
        setNotFoundError(true);
        return false;
      }
      const data = await response.json();
      setFileName(data.name || "Untitled Document");
      return true;
    } catch (error: any) {
      console.error("PDFViewer: Error fetching file info:", error);
      toast.error("Failed to load document information. Please check your connection or try again later.");
      setFileName("Untitled Document");
      setNotFoundError(true);
      return false;
    }
  }, [pdfId]);

  useEffect(() => {
    let isMounted = true;
    console.log("PDFViewer: Main useEffect triggered for pdfId:", pdfId);

    setFileName('');
    setIsOwner(false);
    setUserRole('');
    setListUsers([]);
    setNotFoundError(false);
    setUnauthorizedError(false);
    setIsFileLoading(true);

    if (!pdfId) {
      if (isMounted) {
        setNotFoundError(true);
        setIsFileLoading(false);
      }
      return;
    }

    const loadAllData = async () => {
      const fileInfoSuccess = await fetchFileInfo();
      if (!isMounted || !fileInfoSuccess) {
        if(isMounted) setIsFileLoading(false);
        return;
      }

      const fetchedRole = await fetchUserRole();
      if (!isMounted || !fetchedRole) {
        if(isMounted) setIsFileLoading(false);
        return;
      }
      
      if (fetchedRole === 'owner') {
         await fetchListUsers();
      }

      if (isMounted) {
        setIsFileLoading(false);
      }
    };

    loadAllData();

    return () => {
      isMounted = false;
      console.log("PDFViewer: Cleanup for pdfId:", pdfId);
    };
  }, [pdfId, fetchFileInfo, fetchUserRole, fetchListUsers]);

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

  const downloadFileWithAnnotations = async () => {
    try {
      toast.info("Preparing download with annotations...");
      
      if (userRole !== 'owner' && userRole !== 'editor') {
        toast.error("You don't have permission to download with annotations");
        return;
      }
      
      const response = await fetch(`/api/file/${pdfId}/download-with-annotations`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You don't have permission to download with annotations");
          return;
        }
        throw new Error(`Failed to get download info: ${response.status}`);
      }
      
      const downloadInfo = await response.json();
      
      if (!downloadInfo.hasAnnotations) {
        toast.info("No annotations found, downloading original file...");
        await downloadFile();
        return;
      }

      if (!window.Core || !window.documentViewer) {
        toast.error("PDF viewer not ready. Please wait for the document to load completely.");
        return;
      }

      try {
        const doc = window.documentViewer.getDocument();
        if (!doc) {
          toast.error("Document not loaded. Please wait for the document to load completely.");
          return;
        }

        const annotationManager = window.documentViewer.getAnnotationManager();
        
        const annotations = annotationManager.getAnnotationsList();
        if (annotations.length === 0) {
          toast.info("No visible annotations found, downloading original file...");
          await downloadFile();
          return;
        }

        toast.info("Flattening annotations into PDF...");
        
        const data = await doc.getFileData({
          flatten: true,
          includeAnnotations: true
        });
        
        const blob = new Blob([data], { type: 'application/pdf' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        
        const baseFileName = fileName.replace(/\.pdf$/i, '') || "document";
        link.download = `${baseFileName}_with_annotations.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("Download with annotations completed!");
      } catch (pdfError) {
        console.error("PDFViewer: Error creating flattened PDF:", pdfError);
        toast.error("Failed to create PDF with annotations. Downloading original file instead...");
        await downloadFile();
      }
    } catch (error) {
      console.error("PDFViewer: Error downloading file with annotations:", error);
      toast.error("Failed to download document with annotations");
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
  
  if (isFileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-10">
          <h1 className="text-2xl font-semibold mb-4 text-gray-700">Loading document...</h1>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (notFoundError) {
    return <NotFoundPage />;
  }

  if (unauthorizedError) {
    return <UnauthorizedPage />;
  }
  
  return (
    <div className="max-w-full text-black bg-white flex flex-col h-full min-h-0">
      <ToastContainer position="bottom-right" />
      
      <div className="flex-1 min-h-0 text-black bg-white flex flex-col">
        <PDFToolbar 
          fileName={fileName}
          isOwner={isOwner}
          userRole={userRole}
          onNavigateBack={() => router.push('/dashboard/document-list')}
          onDelete={deleteFile}
          onDownload={downloadFile}
          onDownloadWithAnnotations={downloadFileWithAnnotations}
          onShare={() => setShowPermissionDialog(true)}
        />
        
        <PDFViewerCore pdfId={pdfId} />
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