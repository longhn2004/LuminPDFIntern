"use client";

import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { useAppTranslations } from '@/hooks/useTranslations';

interface AuthGuardProps {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  onSignIn: () => void;
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  isAuthLoading,
  isAuthenticated,
  onSignIn,
  children
}) => {
  const translations = useAppTranslations();

  if (isAuthLoading) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
        <p className="text-gray-500">{translations.dashboard("authGuardMessage")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <FaFileAlt className="text-gray-400 text-5xl" />
        </div>
        <p className="text-gray-500 mb-4">{translations.dashboard("signInPrompt")}</p>
        <button 
          onClick={onSignIn}
          className="bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-md transition-colors duration-300"
        >
          {translations.auth("signin")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard; 