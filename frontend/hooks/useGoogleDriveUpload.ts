import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';

interface GoogleDriveUploadState {
  uploading: boolean;
  fileName: string;
  progress: number;
}

interface UseGoogleDriveUploadProps {
  onUploadComplete?: () => void;
}

export function useGoogleDriveUpload({ onUploadComplete }: UseGoogleDriveUploadProps = {}) {
  const t = useTranslations();
  const [uploadState, setUploadState] = useState<GoogleDriveUploadState>({
    uploading: false,
    fileName: '',
    progress: 0,
  });

  // Extract Google Drive file ID from various URL formats
  const extractFileIdFromUrl = (url: string): string => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID/view
      /id=([a-zA-Z0-9_-]+)/,         // https://drive.google.com/open?id=FILE_ID
      /\/folders\/([a-zA-Z0-9_-]+)/, // For folder IDs
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // If no pattern matches, assume the input is already a file ID
    if (/^[a-zA-Z0-9_-]{10,}$/.test(url)) {
      return url;
    }

    throw new Error('Invalid Google Drive URL or file ID');
  };

  const uploadFromDrive = async (fileIdOrUrl: string, fileName?: string) => {
    try {
      // Extract file ID
      let fileId: string;
      try {
        fileId = extractFileIdFromUrl(fileIdOrUrl);
      } catch (error) {
        throw new Error(t('fileUpload.invalidGoogleDriveUrl'));
      }
      
      // Set initial upload state
      setUploadState({
        uploading: true,
        fileName: fileName || 'Google Drive File',
        progress: 0,
      });

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      // Make API call
      const response = await fetch('/api/file/upload-from-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Complete progress
      setUploadState(prev => ({
        ...prev,
        progress: 100,
      }));

      // Show success message
      toast.success(t('notifications.googleDriveUploadSuccess', { fileName: result.name }));

      // Call completion callback
      onUploadComplete?.();

      // Reset state after a short delay
      setTimeout(() => {
        setUploadState({
          uploading: false,
          fileName: '',
          progress: 0,
        });
      }, 1000);

      return result;

    } catch (error: any) {
      console.error('Google Drive upload failed:', error);
      
      // Reset upload state
      setUploadState({
        uploading: false,
        fileName: '',
        progress: 0,
      });

      // Show error message
      toast.error(error.message || t('fileUpload.failedToUploadFromGoogleDrive'));
      throw error;
    }
  };

  const cancelUpload = () => {
    setUploadState({
      uploading: false,
      fileName: '',
      progress: 0,
    });
    toast.info(t('notifications.googleDriveUploadCancelled'));
  };

  return {
    uploadState,
    uploadFromDrive,
    cancelUpload,
    extractFileIdFromUrl,
  };
} 