"use client";

import React from 'react';
import UploadButton from './UploadButton';
import GoogleDriveButton from './GoogleDriveButton';

interface DocumentListHeaderProps {
  totalFiles: number;
  isAuthenticated: boolean;
  onUpload: (file: File) => void;
  onGoogleDriveUpload: (fileIdOrUrl: string) => Promise<void>;
  uploading?: boolean;
  googleDriveUploading?: boolean;
}

const DocumentListHeader: React.FC<DocumentListHeaderProps> = ({
  totalFiles,
  isAuthenticated,
  onUpload,
  onGoogleDriveUpload,
  uploading = false,
  googleDriveUploading = false
}) => {
  const isAnyUploading = uploading || googleDriveUploading;

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-gray-900">My Document</h2>
        {isAuthenticated && (
          <span className="ml-2 text-sm text-gray-500">Total {totalFiles}</span>
        )}
      </div>
      
      {/* Upload buttons, only if there are files */}
      {totalFiles > 0 && (
        <div className="flex gap-2">
          <UploadButton 
            onUpload={onUpload}
            disabled={isAnyUploading}
          />
          <GoogleDriveButton
            onUpload={onGoogleDriveUpload}
            disabled={isAnyUploading}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentListHeader; 