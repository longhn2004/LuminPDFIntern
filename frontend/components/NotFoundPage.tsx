"use client";

import Link from 'next/link';
import React from 'react';

interface NotFoundPageProps {
  title?: string;
  message?: string;
  backUrl?: string;
  backText?: string;
}

/**
 * NotFoundPage component for displaying 404 errors
 * Can be customized for different contexts
 */
const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = "Document Not Found",
  message = "Sorry, the document you are looking for does not exist or may have been moved.",
  backUrl = "/dashboard/document-list",
  backText = "Go to Dashboard"
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-6xl font-bold text-red-500 mb-4" aria-label="Error 404">
          404
        </h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">
          {title}
        </h2>
        <p className="text-lg mb-8 text-gray-600 leading-relaxed">
          {message}
        </p>
        <Link 
          href={backUrl}
          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {backText}
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage; 