"use client";

import Link from 'next/link';

export default function UnauthorizedPage() {{
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <h1 className="text-6xl font-bold text-yellow-500">401</h1>
      <h2 className="text-2xl font-semibold mb-4">Unauthorized Access</h2>
      <p className="text-lg mb-8 text-center max-w-md">
        Sorry, you do not have permission to access this document. 
        Please contact the owner of the document to request access.
      </p>
      <Link href="/dashboard/document-list" className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Go to Dashboard
      </Link>
    </div>
  );
}} 