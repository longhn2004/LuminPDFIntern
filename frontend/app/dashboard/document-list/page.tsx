"use client";

import React, { useEffect, useState } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { useRouter } from 'next/navigation';
import { ToastContainer } from 'react-toastify';
import DashboardHeader from '@/components/DashboardHeader';
import DocumentListHeader from '@/components/document-list/DocumentListHeader';
import AuthGuard from '@/components/document-list/AuthGuard';
import DocumentTable from '@/components/document-list/DocumentTable';
import EmptyState from '@/components/document-list/EmptyState';
import UploadModal from '@/components/document-list/UploadModal';
import { useDocumentList } from '@/hooks/useDocumentList';
import { useFileUpload } from '@/hooks/useFileUpload';
import 'react-toastify/dist/ReactToastify.css';

function DocumentList() {
  const user = useAppSelector(state => state.user);
  const router = useRouter();
  
  // Authentication state
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Custom hooks
  const {
    files,
    totalFiles,
    loading,
    sortOrder,
    hasMore,
    toggleSort,
    loadMore,
    refreshFiles,
    formatDate
  } = useDocumentList({ isAuthenticated: user.isAuthenticated });

  const { uploadState, uploadFile, cancelUpload } = useFileUpload({
    onUploadComplete: refreshFiles
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          // User is authenticated, data should already be in Redux store
          setAuthLoading(false);
          setAuthChecked(true);
        } else {
          // User is not authenticated
          setAuthLoading(false);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setAuthLoading(false);
        setAuthChecked(true);
      }
    };

    // Always check auth on component mount if not already checked
    if (!authChecked) {
      checkAuth();
    }
  }, [authChecked]);

  // Handle file click navigation
  const handleFileClick = (fileId: string) => {
    router.push(`/dashboard/viewpdf/${fileId}`);
  };

  // Handle sign in navigation
  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  return (
    <div className="h-screen bg-white fixed inset-0 flex flex-col w-full">
      <DashboardHeader />

      {/* Main */}
      <main className="mx-auto text-black flex-1 overflow-hidden w-full">
        <div className="bg-white p-6 h-full">
          <DocumentListHeader
            totalFiles={totalFiles}
            isAuthenticated={user.isAuthenticated}
            onUpload={uploadFile}
            uploading={uploadState.uploading}
          />

          {/* Content based on authentication and file status */}
          <AuthGuard
            isAuthLoading={authLoading || !authChecked}
            isAuthenticated={user.isAuthenticated}
            onSignIn={handleSignIn}
          >
            {totalFiles > 0 ? (
              <DocumentTable
                files={files}
                loading={loading}
                hasMore={hasMore}
                sortOrder={sortOrder}
                currentUserName={user.name || ''}
                onSortToggle={toggleSort}
                onFileClick={handleFileClick}
                onLoadMore={loadMore}
                formatDate={formatDate}
              />
            ) : (
              <EmptyState
                onUpload={uploadFile}
                uploading={uploadState.uploading}
              />
            )}
          </AuthGuard>
        </div>
      </main>

      {/* Upload progress modal */}
      <UploadModal
        isVisible={uploadState.uploading}
        fileName={uploadState.fileName}
        progress={uploadState.progress}
        onCancel={cancelUpload}
      />

      {/* Toast container */}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default DocumentList;