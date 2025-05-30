"use client";

import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import UploadButton from './UploadButton';

interface EmptyStateProps {
  onUpload: (file: File) => void;
  uploading?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUpload, uploading = false }) => {
  return (
    <div className="text-center w-full h-full">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex justify-center mb-4">
          <FaFileAlt className="text-gray-400 text-5xl" />
        </div>
        <p className="text-gray-500 mb-6">There is no document found</p>
        <UploadButton 
          onUpload={onUpload}
          disabled={uploading}
          className="bg-yellow-400 hover:bg-yellow-500 px-6 py-2"
        />
      </div>
    </div>
  );
};

export default EmptyState; 