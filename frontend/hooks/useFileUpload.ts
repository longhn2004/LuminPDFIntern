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
    cancelUpload
  };
}; 