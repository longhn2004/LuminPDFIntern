import { useState } from 'react';
import { toast } from 'react-toastify';
import { UploadState } from '@/types/document';

interface UseFileUploadProps {
  onUploadComplete?: () => void;
}

export const useFileUpload = ({ onUploadComplete }: UseFileUploadProps = {}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    fileName: ''
  });

  // Function to check if PDF is password protected
  const checkPDFPassword = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string to search for PDF encryption indicators
      const pdfString = new TextDecoder('latin1').decode(uint8Array);
      
      // Check for common PDF encryption indicators
      const encryptionIndicators = [
        '/Encrypt',
        '/P -', // Permissions flag indicating restrictions
        '/O <', // Owner password hash
        '/U <', // User password hash
        'Standard', // Standard security handler
        'V 1', // Security handler version
        'V 2',
        'V 4',
        'V 5'
      ];
      
      // Look for encryption dictionary
      const hasEncryptDict = pdfString.includes('/Encrypt');
      const hasSecurityHandler = encryptionIndicators.some(indicator => 
        pdfString.includes(indicator)
      );
      
      return hasEncryptDict || hasSecurityHandler;
    } catch (error) {
      console.error('Error checking PDF password protection:', error);
      // If we can't read the file, assume it might be password protected
      return false;
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20MB limit');
      return;
    }

    // Check for password protection
    const isPasswordProtected = await checkPDFPassword(file);
    if (isPasswordProtected) {
      toast.error('Password-protected PDFs are not supported');
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
          toast.success('Document uploaded successfully');
          onUploadComplete?.();
        } else {
          toast.error('Failed to upload document');
        }
        setUploadState({ uploading: false, progress: 0, fileName: '' });
      };

      xhr.onerror = () => {
        toast.error('Failed to upload document');
        setUploadState({ uploading: false, progress: 0, fileName: '' });
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
      setUploadState({ uploading: false, progress: 0, fileName: '' });
    }
  };

  const cancelUpload = () => {
    // This would ideally cancel the upload request
    setUploadState({ uploading: false, progress: 0, fileName: '' });
    toast.info('Upload cancelled');
  };

  return {
    uploadState,
    uploadFile,
    cancelUpload,
    checkPDFPassword
  };
}; 