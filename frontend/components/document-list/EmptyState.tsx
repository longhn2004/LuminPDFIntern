"use client";

import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import UploadButton from './UploadButton';
import GoogleDriveButton from './GoogleDriveButton';
import { useAppTranslations } from '@/hooks/useTranslations';

interface EmptyStateProps {
  onUpload: (file: File) => void;
  onGoogleDriveUpload: (fileIdOrUrl: string) => Promise<void>;
  uploading?: boolean;
  googleDriveUploading?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  onUpload, 
  onGoogleDriveUpload,
  uploading = false,
  googleDriveUploading = false
}) => {
  const translations = useAppTranslations();
  const isAnyUploading = uploading || googleDriveUploading;

  return (
    <div className="text-center w-full h-full">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex justify-center mb-4">
          <FaFileAlt className="text-gray-400 text-5xl" />
        </div>
        <p className="text-gray-500 mb-6">{translations.dashboard("emptyStateTitle")}</p>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <UploadButton 
            onUpload={onUpload}
            disabled={isAnyUploading}
            className="bg-yellow-400 hover:bg-yellow-500 px-6 py-2"
          />
          
          <div className="text-gray-400 text-sm">{translations.common("or")}</div>
          
          <GoogleDriveButton
            onUpload={onGoogleDriveUpload}
            disabled={isAnyUploading}
            className="px-6 py-2"
          />
        </div>
        
        {/* <p className="text-gray-400 text-sm mt-4 max-w-md">
          Upload PDF files from your computer or import them directly from Google Drive
        </p> */}
      </div>
    </div>
  );
};

export default EmptyState; 