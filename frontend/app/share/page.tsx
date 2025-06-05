"use client"
import DashboardHeader from '@/components/DashboardHeader';
import SharedPDFViewer from '@/components/share/SharedPDFViewer';
import TokenExpirationChecker from '@/components/TokenExpirationChecker';
import { useSearchParams } from 'next/navigation';
import { useAppTranslations } from '@/hooks/useTranslations';

export default function SharePage() {
  const translations = useAppTranslations();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('token');

  // Check if token is missing or invalid format
  if (!shareToken || shareToken.trim() === '') {
    return (
      <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
        <TokenExpirationChecker />
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-10 max-w-md">
            <div className="mb-6">
            <svg 
              className="mx-auto h-16 w-16 text-red-500 mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
            <h1 className="text-2xl font-semibold mb-4 text-red-600">
              {translations.share("invalidLink")}
            </h1>
            <p className="text-gray-600 mb-6">
              {translations.share("invalidLinkMessage")}
            </p>
          </div>
          
          <div className="space-y-3">
            <a
              href="/auth/signin"
              className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {translations.share("goToLogin")}
            </a>
            <a
              href="/dashboard/document-list"
              className="block w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              {translations.viewer("goToDashboard")}
            </a>
          </div>
        </div>
      </div>
      </div>
    );
  }
  
  return (
    <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
      <TokenExpirationChecker />
      <DashboardHeader />
      <SharedPDFViewer shareToken={shareToken} />
    </div>
  );
}