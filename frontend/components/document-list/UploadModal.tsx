"use client";

import React from 'react';

interface UploadModalProps {
  isVisible: boolean;
  fileName: string;
  progress: number;
  onCancel: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isVisible,
  fileName,
  progress,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-black">
      <div className="bg-white rounded-lg w-96 p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Uploading</span>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="mb-2 truncate">{fileName}</div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-right mt-1 text-sm text-gray-500">
          {progress}%
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 