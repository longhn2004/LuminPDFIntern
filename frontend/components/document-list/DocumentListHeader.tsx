"use client";

import React from 'react';
import UploadButton from './UploadButton';

interface DocumentListHeaderProps {
  totalFiles: number;
  isAuthenticated: boolean;
  onUpload: (file: File) => void;
  uploading?: boolean;
}

const DocumentListHeader: React.FC<DocumentListHeaderProps> = ({
  totalFiles,
  isAuthenticated,
  onUpload,
  uploading = false
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-gray-900">My Document</h2>
        {isAuthenticated && (
          <span className="ml-2 text-sm text-gray-500">Total {totalFiles}</span>
        )}
      </div>
      
      {/* Upload button, only if there are files */}
      {totalFiles > 0 && (
        <UploadButton 
          onUpload={onUpload}
          disabled={uploading}
        />
      )}
    </div>
  );
};

export default DocumentListHeader; 