"use client"
import { HTTP_STATUS } from "@/libs/constants/httpStatus";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PermissionDialog from './PermissionDialog';
import PDFToolbar from './PDFToolbar';
import PDFViewerCore from './PDFViewerCore';
import NotFoundPage from '../NotFoundPage';
import UnauthorizedPage from '../UnauthorizedPage';
import { useAppTranslations } from "@/hooks/useTranslations";

interface PDFViewerProps {
  pdfId: string;
  className?: string;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Hook for managing user permissions and file data
 */
const useFilePermissions = (pdfId: string) => {
  const [fileName, setFileName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [listUsers, setListUsers] = useState<UserInfo[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [unauthorizedError, setUnauthorizedError] = useState(false);

  const resetState = useCallback(() => {
    setFileName('');
    setIsOwner(false);
    setUserRole('');
    setListUsers([]);
    setNotFoundError(false);
    setUnauthorizedError(false);
    setIsFileLoading(true);
  }, []);

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
    } catch (error: unknown) {
      console.error("PDFViewer: Error fetching file info:", error);
      toast.error("Failed to load document information. Please check your connection or try again later.");
      setFileName("Untitled Document");
      setNotFoundError(true);
      return false;
    }
  }, [pdfId]);

  return {
    fileName,
    isOwner,
    userRole,
    listUsers,
    isFileLoading,
    notFoundError,
    unauthorizedError,
    resetState,
    fetchListUsers,
    fetchUserRole,
    fetchFileInfo,
    setIsFileLoading
  };
};

/**
 * Custom hook for download functionality
 */
const useDownloadHandlers = (pdfId: string, fileName: string, userRole: string) => {
  const translations = useAppTranslations();

  const downloadFile = useCallback(async () => {
    try {
      const response = await fetch(`/api/file/${pdfId}/download`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDFViewer: Error downloading file:", error);
      toast.error(translations.errors("fileNotFound"));
    }
  }, [pdfId, fileName, translations]);

  const downloadFileWithAnnotations = useCallback(async () => {
      if (userRole !== 'owner' && userRole !== 'editor' && userRole !== 'viewer') {
      toast.error(translations.errors("accessDenied"));
        return;
      }
      
    try {
      const documentViewer = window.documentViewer;
      if (!documentViewer) {
        throw new Error('Document viewer not available');
      }
      
      const doc = documentViewer.getDocument();
      if (!doc) {
        throw new Error('Document not loaded');
      }

      try {
        const annotManager = documentViewer.getAnnotationManager();
        const xfdfString = await annotManager.exportAnnotations();
        
        const data = await doc.getFileData({
          xfdfString,
          flatten: true,
          includeAnnotations: true
        });
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        
        const baseFileName = fileName.replace(/\.pdf$/i, '') || "document";
        link.download = `${baseFileName}_with_annotations.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(translations.viewer("downloadWithAnnotationsCompleted"));
      } catch (pdfError) {
        console.error("PDFViewer: Error creating flattened PDF:", pdfError);
        toast.error(translations.viewer("failedToCreatePDFWithAnnotations"));
        await downloadFile();
      }
    } catch (error) {
      console.error("PDFViewer: Error downloading file with annotations:", error);
      toast.error(translations.viewer("failedToDownloadWithAnnotations"));
    }
  }, [userRole, downloadFile, fileName, translations]);

  return {
    downloadFile,
    downloadFileWithAnnotations
  };
};

/**
 * PDFViewer component provides a complete PDF viewing experience
 * with permission management, annotations, and download functionality
 */
export default function PDFViewer({ pdfId, className = "" }: PDFViewerProps) {
  const translations = useAppTranslations();
  const router = useRouter();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const {
    fileName,
    isOwner,
    userRole,
    listUsers,
    isFileLoading,
    notFoundError,
    unauthorizedError,
    resetState,
    fetchListUsers,
    fetchUserRole,
    fetchFileInfo,
    setIsFileLoading
  } = useFilePermissions(pdfId);

  const { downloadFile, downloadFileWithAnnotations } = useDownloadHandlers(pdfId, fileName, userRole);

  // Memoize computed values
  const shouldShowContent = useMemo(() => {
    return !isFileLoading && !notFoundError && !unauthorizedError;
  }, [isFileLoading, notFoundError, unauthorizedError]);

  const deleteFile = useCallback(async () => {
    if (!confirm(translations.viewer("deleteConfirmation"))) {
      return;
    }
    
    try {
      toast.info(translations.viewer("deletingDocument"));
      const response = await fetch(`/api/file/${pdfId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }
      
      await response.json();
      toast.success(translations.viewer("documentDeletedSuccessfully"));
      router.push('/dashboard/document-list');
    } catch (error) {
      console.error("PDFViewer: Error deleting file:", error);
      toast.error(translations.viewer("failedToDeleteDocument"));
    }
  }, [pdfId, router, translations]);

  const handleNavigateBack = useCallback(() => {
    router.push('/dashboard/document-list');
  }, [router]);

  const handleShare = useCallback(() => {
    setShowPermissionDialog(true);
  }, []);

  const handleClosePermissionDialog = useCallback(() => {
    setShowPermissionDialog(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log("PDFViewer: Main useEffect triggered for pdfId:", pdfId);

    if (!pdfId) {
      if (isMounted) {
        resetState();
        setIsFileLoading(false);
      }
      return;
    }

    resetState();

    const loadAllData = async () => {
      const fileInfoSuccess = await fetchFileInfo();
      if (!isMounted || !fileInfoSuccess) {
        if (isMounted) setIsFileLoading(false);
        return;
      }

      const fetchedRole = await fetchUserRole();
      if (!isMounted || !fetchedRole) {
        if (isMounted) setIsFileLoading(false);
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
  }, [pdfId, resetState, fetchFileInfo, fetchUserRole, fetchListUsers, setIsFileLoading]);

  // Loading state
  if (isFileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-10">
          <h1 className="text-2xl font-semibold mb-4 text-gray-700">{translations.viewer("loadingDocument")}</h1>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error states
  if (notFoundError) {
    return <NotFoundPage 
      title={translations.viewer("documentNotFound")}
      message={translations.viewer("documentNotFoundMessage")}
      showHeader={false}
      showTokenChecker={false}
    />;
  }

  if (unauthorizedError) {
    return <UnauthorizedPage 
      title={translations.viewer("unauthorizedAccess")}
      message={translations.viewer("unauthorizedMessage")}
      showHeader={false}
      showTokenChecker={false}
    />;
  }
  
  return (
    <div className={`max-w-full text-black bg-white flex flex-col h-full min-h-0 ${className}`}>
      <ToastContainer position="bottom-right" />
      
      {shouldShowContent && (
        <div className="flex-1 min-h-0 text-black bg-white flex flex-col">
          <PDFToolbar 
            fileName={fileName}
            isOwner={isOwner}
            userRole={userRole}
            onNavigateBack={handleNavigateBack}
            onDelete={deleteFile}
            onDownload={downloadFile}
            onDownloadWithAnnotations={downloadFileWithAnnotations}
            onShare={handleShare}
          />
          
          <PDFViewerCore pdfId={pdfId} />
        </div>
      )}

      <PermissionDialog 
        isOpen={showPermissionDialog}
        onClose={handleClosePermissionDialog}
        fileName={fileName}
        pdfId={pdfId}
        listUsers={listUsers}
        fetchListUsers={fetchListUsers}
      />
    </div>
  );
}