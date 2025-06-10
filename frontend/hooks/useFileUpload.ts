import { useState } from 'react';
import { toast } from 'react-toastify';
import { UploadState } from '@/types/document';
import { useTranslations } from 'next-intl';

interface UseFileUploadProps {
  onUploadComplete?: () => void;
}

export const useFileUpload = ({ onUploadComplete }: UseFileUploadProps = {}) => {
  const t = useTranslations();
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    fileName: ''
  });

  // Function to check if PDF is password protected
  const checkPDFPassword = async (file: File): Promise<boolean> => {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string for pattern matching
      const pdfContent = new TextDecoder('latin1').decode(uint8Array);
      
      // Check for common encryption indicators in PDF structure
      const encryptionPatterns = [
        '/Encrypt',      // Most common encryption indicator
        '/Filter/Standard', // Standard security handler
        '/V 1',          // Security handler version
        '/V 2',          // Security handler version  
        '/V 4',          // Security handler version
        '/R 2',          // Revision number for security handler
        '/R 3',          // Revision number for security handler
        '/R 4',          // Revision number for security handler
        'endobj',        // Look for encryption object structure
      ];
      
      // Check if PDF header is present
      if (!pdfContent.startsWith('%PDF-')) {
        console.warn('Invalid PDF file format');
        return false;
      }
      
      // Look for encryption patterns
      let encryptionIndicators = 0;
      for (const pattern of encryptionPatterns) {
        if (pdfContent.includes(pattern)) {
          encryptionIndicators++;
        }
      }
      
      // If we find encryption patterns, especially /Encrypt, it's likely password protected
      const isEncrypted = pdfContent.includes('/Encrypt') || encryptionIndicators >= 3;
      
      if (isEncrypted) {
        console.log('PDF appears to be password protected');
      }
      
      return isEncrypted;
    } catch (error) {
      console.error('Error checking PDF password protection:', error);
      // If we can't read the file, assume it's not password protected
      // to avoid blocking valid uploads
      return false;
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file
    if (file.type !== 'application/pdf') {
      toast.error(t('fileUpload.onlyPDFAllowed'));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error(t('fileUpload.fileSizeExceeds'));
      return;
    }

    // Check for password protection
    const isPasswordProtected = await checkPDFPassword(file);
    if (isPasswordProtected) {
      toast.error(t('fileUpload.passwordProtectedNotSupported'));
      return;
    }

    setUploadState({
      uploading: true,
      progress: 0,
      fileName: file.name
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/file/upload', true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadState(prev => ({ ...prev, progress }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast.success(t('notifications.documentUploaded'));
          onUploadComplete?.();
        } else {
          toast.error(t('fileUpload.failedToUploadDocument'));
        }
        setUploadState({ uploading: false, progress: 0, fileName: '' });
      };

      xhr.onerror = () => {
        toast.error(t('fileUpload.failedToUploadDocument'));
        setUploadState({ uploading: false, progress: 0, fileName: '' });
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t('fileUpload.failedToUploadDocument'));
      setUploadState({ uploading: false, progress: 0, fileName: '' });
    }
  };

  const cancelUpload = () => {
    // This would ideally cancel the upload request
    setUploadState({ uploading: false, progress: 0, fileName: '' });
    toast.info(t('notifications.uploadCancelled'));
  };

  return {
    uploadState,
    uploadFile,
    cancelUpload,
    checkPDFPassword
  };
}; 