"use client"
import DashboardHeader from '@/components/DashboardHeader';
import SharedPDFViewer from '@/components/share/SharedPDFViewer';
import { useSearchParams } from 'next/navigation';

export default function SharePage() {
  // Get the shareable link token from query params
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('token');

  // Handle missing token
  if (!shareToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-10 max-w-md">
          <h1 className="text-2xl font-semibold mb-4 text-red-600">Invalid Link</h1>
          <p className="text-gray-600 mb-4">
            This shareable link is missing required information. Please check the URL or request a new link.
          </p>
          <a
            href="/auth/signin"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-h-screen text-black bg-white flex flex-col fixed inset-0">
      <DashboardHeader />
      <SharedPDFViewer shareToken={shareToken} />
    </div>
  );
}