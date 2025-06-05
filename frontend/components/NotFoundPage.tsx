"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import TokenExpirationChecker from '@/components/TokenExpirationChecker';
import { useAppTranslations } from '@/hooks/useTranslations';

interface NotFoundPageProps {
  title?: string;
  message?: string;
  showHeader?: boolean;
  showTokenChecker?: boolean;
  customActions?: React.ReactNode;
}

/**
 * NotFoundPage component for displaying 404 errors
 * Can be customized for different contexts
 */
const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title,
  message,
  showHeader = true,
  showTokenChecker = true,
  customActions
}) => {
  const translations = useAppTranslations();
  const router = useRouter();

  // Use provided props or fall back to translations
  const displayTitle = title || translations.errors("notFound");
  const displayMessage = message || translations.viewer("documentNotFoundMessage");

  const handleGoToDashboard = () => {
    router.push('/dashboard/document-list');
  };

  return (
    <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
      {showTokenChecker && <TokenExpirationChecker />}
      {showHeader && <DashboardHeader />}
      
      <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            {/* 404 Large Number */}
            <div className="text-9xl font-bold text-gray-300 mb-4 select-none">
              404
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {displayTitle}
            </h1>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              {displayMessage}
            </p>
          </div>
          
          {customActions ? customActions : (
            <div className="space-y-3">
              <button
                onClick={handleGoToDashboard}
                className="block w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {translations.viewer("goToDashboard")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 