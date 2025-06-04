"use client"
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PDFToolbar from './SharedPDFToolbar';
import PDFViewerCore from './SharedPDFViewerCore';
import NotFoundPage from '../NotFoundPage';
import UnauthorizedPage from '../UnauthorizedPage';
import { useAppTranslations } from "@/hooks/useTranslations";

interface SharedPDFViewerProps {
  shareToken: string;
  className?: string;
}

interface AccessInfo {
  fileId: string;
  fileName: string;
  accessGranted: boolean;
  role: 'viewer' | 'editor';
  temporary?: boolean;
  message?: string;
}

/**
 * Hook for managing shared file access via token
 */
const useSharedFileAccess = (shareToken: string) => {
  const translations = useAppTranslations();
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const validateToken = useCallback(async () => {
    if (!shareToken) {
      setError(translations.share("noShareToken"));
      setIsLoading(false);
      return;
    }

    try {
      console.log('SharedPDFViewer: Validating share token');
      setIsLoading(true);
      setError(null);
      setNotFound(false);
      setUnauthorized(false);

      const response = await fetch('/api/file/access-via-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: shareToken }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (response.status === 403) {
          setUnauthorized(true);
          return;
        }
        throw new Error(`${translations.share("failedToValidateShareToken")}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('SharedPDFViewer: Access granted:', data);

      if (!data.accessGranted) {
        setUnauthorized(true);
        return;
      }

      setAccessInfo(data);
      
      // Show success message for temporary access
      if (data.temporary) {
        toast.info(`${data.message}`, { autoClose: 3000 });
      }

    } catch (err: any) {
      console.error('SharedPDFViewer: Error validating token:', err);
      setError(err.message || translations.share("failedToValidateShareToken"));
    } finally {
      setIsLoading(false);
    }
  }, [shareToken]);

  return {
    accessInfo,
    isLoading,
    error,
    notFound,
    unauthorized,
    validateToken
  };
};

/**
 * Custom hook for shared download functionality
 */
const useSharedDownloadHandlers = (accessInfo: AccessInfo | null, shareToken: string) => {
  const translations = useAppTranslations();

  const downloadFile = useCallback(async () => {
    if (!accessInfo || !accessInfo.accessGranted) {
      toast.error(translations.errors("accessDenied"));
      return;
    }

    try {
      const response = await fetch(`/api/file/access-via-link?token=${shareToken}&action=download`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = accessInfo.fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("SharedPDFViewer: Error downloading file:", error);
      toast.error(translations.errors("fileNotFound"));
    }
  }, [accessInfo, shareToken]);

  const downloadFileWithAnnotations = useCallback(async () => {
    if (!accessInfo || !accessInfo.accessGranted) {
      toast.error(translations.errors("accessDenied"));
      return;
    }

    if (accessInfo.role !== 'editor') {
      toast.error(translations.errors("accessDenied"));
      return;
    }

    try {
      const response = await fetch(`/api/file/${accessInfo.fileId}/download-with-annotations?token=${shareToken}`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error(translations.errors("accessDenied"));
          return;
        }
        throw new Error(`Failed to get download info: ${response.status}`);
      }
      
      const downloadInfo = await response.json();
      
      if (!downloadInfo.hasAnnotations) {
        toast.info(translations.viewer("failedToCreatePDFWithAnnotations"));
        await downloadFile();
        return;
      }

      if (!window.Core || !window.documentViewer) {
        toast.error(translations.share("pdfViewerNotReady"));
        return;
      }

      try {
        const doc = (window.documentViewer as any).getDocument();
        if (!doc) {
          toast.error(translations.share("documentNotLoaded"));
          return;
        }

        const annotationManager = (window.documentViewer as any).getAnnotationManager();
        
        const annotations = annotationManager.getAnnotationsList();
        if (annotations.length === 0) {
          toast.info(translations.viewer("failedToCreatePDFWithAnnotations"));
          await downloadFile();
          return;
        }

        const xfdfString = await annotationManager.exportAnnotations();
        
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
        
        const baseFileName = accessInfo.fileName.replace(/\.pdf$/i, '') || "document";
        link.download = `${baseFileName}_with_annotations.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(translations.viewer("downloadWithAnnotationsCompleted"));
      } catch (pdfError) {
        console.error("SharedPDFViewer: Error creating flattened PDF:", pdfError);
        toast.error(translations.viewer("failedToCreatePDFWithAnnotations"));
        await downloadFile();
      }
    } catch (error) {
      console.error("SharedPDFViewer: Error downloading file with annotations:", error);
      toast.error(translations.viewer("failedToDownloadWithAnnotations"));
    }
  }, [accessInfo, shareToken, downloadFile, translations]);

  return {
    downloadFile,
    downloadFileWithAnnotations
  };
};

/**
 * SharedPDFViewer component provides PDF viewing for shared files via shareable links
 * Designed specifically for temporary access without permanent permissions
 */
export default function SharedPDFViewer({ shareToken, className = "" }: SharedPDFViewerProps) {
  const translations = useAppTranslations();
  const router = useRouter();

  const {
    accessInfo,
    isLoading,
    error,
    notFound,
    unauthorized,
    validateToken
  } = useSharedFileAccess(shareToken);

  const { downloadFile, downloadFileWithAnnotations } = useSharedDownloadHandlers(accessInfo, shareToken);

  // Memoize computed values
  const shouldShowContent = useMemo(() => {
    return !isLoading && !error && !notFound && !unauthorized && accessInfo?.accessGranted;
  }, [isLoading, error, notFound, unauthorized, accessInfo]);

  const handleNavigateBack = useCallback(() => {
    router.push('/auth/signin');
  }, [router]);

  // Validate token on mount and when token changes
  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // Show shared file notice when access is granted
  useEffect(() => {
    if (accessInfo && shouldShowContent) {
      console.log('SharedPDFViewer: Access granted for shared file:', accessInfo);
    }
  }, [accessInfo, shouldShowContent]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-10">
          <h1 className="text-2xl font-semibold mb-4 text-gray-700">{translations.share("validatingSharedLink")}</h1>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error states
  if (notFound || error?.includes('not found')) {
    return <NotFoundPage 
      title={translations.viewer("documentNotFound")}
      message={translations.viewer("documentNotFoundMessage")}
      showHeader={false}
      showTokenChecker={false}
    />;
  }

  if (unauthorized || error?.includes('access') || error?.includes('permission')) {
    return <UnauthorizedPage 
      title={translations.viewer("unauthorizedAccess")}
      message={translations.viewer("unauthorizedMessage")}
      showHeader={false}
      showTokenChecker={false}
    />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-10 max-w-md">
          <h1 className="text-2xl font-semibold mb-4 text-red-600">{translations.common("error")}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={validateToken}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {translations.common("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-full text-black bg-white flex flex-col h-full min-h-0 ${className}`}>
      <ToastContainer position="bottom-right" />
      
      {shouldShowContent && accessInfo && (
        <>
          {/* Shared file notice banner */}
          <div className="bg-green-50 border-b border-green-200 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">
                {translations.share("viewingSharedFile")}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600">
                {accessInfo.role === 'viewer' ? translations.share("ViewerRole") : translations.share("EditorRole")}
                {accessInfo.temporary && ` (${translations.share("temporary")})`}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 text-black bg-white flex flex-col">
            <PDFToolbar 
              fileName={accessInfo.fileName}
              isOwner={false} // Shared access never gives ownership
              userRole={accessInfo.role}
              onNavigateBack={handleNavigateBack}
              onDelete={() => {}} // No delete for shared access
              onDownload={downloadFile}
              onDownloadWithAnnotations={downloadFileWithAnnotations}
              onShare={() => {}} // No share for shared access
            />
            
            <PDFViewerCore 
              token={shareToken}
              fileId={accessInfo.fileId}
              userRole={accessInfo.role}
              isSharedView={true}
            />
          </div>
        </>
      )}
    </div>
  );
}