"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import TokenExpirationChecker from '@/components/TokenExpirationChecker';
import { useAppTranslations } from '@/hooks/useTranslations';

interface UnauthorizedPageProps {
  title?: string;
  message?: string;
  showHeader?: boolean;
  showTokenChecker?: boolean;
  customActions?: React.ReactNode;
}

/**
 * UnauthorizedPage component for displaying 401 authorization errors
 * Can be customized for different contexts
 */
const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  title,
  message,
  showHeader = true,
  showTokenChecker = true,
  customActions
}) => {
  const translations = useAppTranslations();
  const router = useRouter();

  // Use provided props or fall back to translations
  const displayTitle = title || translations.errors("unauthorized");
  const displayMessage = message || translations.viewer("unauthorizedMessage");

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/document-list');
    }
  };

  return (
    <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
      {showTokenChecker && <TokenExpirationChecker />}
      {showHeader && <DashboardHeader />}
      
      <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            {/* 401 Large Number */}
            <div className="text-9xl font-bold text-gray-300 mb-4 select-none">
              401
            </div>
            
            {/* Unauthorized Icon */}
            <svg 
              className="mx-auto h-16 w-16 text-yellow-500 mb-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 15v2m-6 6h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            
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
                onClick={handleGoBack}
                className="block w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {translations.common("goBack")}
              </button>
              
              <a
                href="/dashboard/document-list"
                className="block w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                {translations.viewer("goToDashboard")}
              </a>
              
              <a
                href="/auth/signin"
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {translations.share("goToLogin")}
              </a>
            </div>
          )}
          
          {/* Additional Help Text */}
          <div className="mt-8 text-sm text-gray-500">
            <p>{translations.common("needHelp")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage; 