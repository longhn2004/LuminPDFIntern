"use client";

import React, { useState } from 'react';
import { FaGoogleDrive } from 'react-icons/fa';
import { useAppTranslations } from '@/hooks/useTranslations';

interface GoogleDriveButtonProps {
  onUpload: (fileIdOrUrl: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const GoogleDriveButton: React.FC<GoogleDriveButtonProps> = ({ 
  onUpload, 
  disabled = false, 
  className = "" 
}) => {
  const translations = useAppTranslations();
  const [showModal, setShowModal] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleOpenModal = () => {
    if (!disabled) {
      setShowModal(true);
      setDriveUrl('');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setDriveUrl('');
  };

  const handleUpload = async () => {
    if (!driveUrl.trim()) return;

    setUploading(true);
    try {
      await onUpload(driveUrl.trim());
      handleCloseModal();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !uploading) {
      handleUpload();
    }
  };

  return (
    <>
      <button 
        onClick={handleOpenModal}
        disabled={disabled}
        className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed px-4 py-2 rounded-md flex items-center transition-colors duration-300 text-white ${className}`}
      >
        <FaGoogleDrive className="mr-2" />
        {translations.dashboard('uploadFromGoogleDrive')}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 p-6 text-black">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{translations.dashboard("uploadFromGoogleDrive")}</h3>
              <button 
                onClick={handleCloseModal}
                disabled={uploading}
                className="text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                {translations.dashboard("googleDrive.urlOrFileIdLabel")}
              </label>
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={uploading}
                placeholder={translations.dashboard("googleDrive.urlPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="mb-4 text-sm text-gray-600">
              <p className="mb-2 text-left"><strong>{translations.dashboard("googleDrive.howToGetUrl")}</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>{translations.dashboard("googleDrive.step1")}</li>
                <li>{translations.dashboard("googleDrive.step2")}</li>
                <li>{translations.dashboard("googleDrive.step3")}</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                {translations.common("cancel")}
              </button>
              <button
                onClick={handleUpload}
                disabled={!driveUrl.trim() || uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {translations.dashboard("uploading")}
                  </>
                ) : (
                  translations.common("upload")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleDriveButton; 