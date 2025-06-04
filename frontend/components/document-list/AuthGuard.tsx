"use client";

import React from 'react';
import { FaFileAlt } from 'react-icons/fa';

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
  if (isAuthLoading) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <FaFileAlt className="text-gray-400 text-5xl" />
        </div>
        <p className="text-gray-500 mb-4">Please log in to view your documents</p>
        <button 
          onClick={onSignIn}
          className="bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-md transition-colors duration-300"
        >
          Sign In
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard; 