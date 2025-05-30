"use client";

import React, { useRef } from 'react';
import { FaUpload } from 'react-icons/fa';

interface UploadButtonProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

const UploadButton: React.FC<UploadButtonProps> = ({ 
  onUpload, 
  disabled = false, 
  className = "" 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <button 
        onClick={triggerFileInput}
        disabled={disabled}
        className={`bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed px-4 py-2 rounded-md flex items-center transition-colors duration-300 ${className}`}
      >
        <FaUpload className="mr-2" />
        Upload Document
      </button>
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />
    </>
  );
};

export default UploadButton; 