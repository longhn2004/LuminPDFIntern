"use client";

import React, { useEffect, useState, useRef } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setUser } from '@/redux/features/userSlice';
import { useRouter } from 'next/navigation';
import { FaSort, FaSortUp, FaSortDown, FaFileAlt } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Type definitions
interface FileItem {
  id: string;
  name: string;
  owner: string;
  role: string;
  updatedAt: string;
}

function DocumentList() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUpload, setCurrentUpload] = useState<string>('');
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          dispatch(setUser({
            email: data.email,
            isEmailVerified: data.isEmailVerified,
            name: data.name || 'User',
            isAuthenticated: true
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (!user.isAuthenticated) {
      fetchUserData();
    }
  }, [dispatch, user.isAuthenticated]);

  // Fetch total files count
  useEffect(() => {
    const fetchTotalFiles = async () => {
      try {
        const response = await fetch('/api/file/total-files', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setTotalFiles(data.total);
        }
      } catch (error) {
        console.error('Error fetching total files:', error);
      }
    };

    if (user.isAuthenticated) {
      fetchTotalFiles();
    }
  }, [user.isAuthenticated, uploading]);

  // Fetch files list
  useEffect(() => {
    const fetchFiles = async () => {
      if (!user.isAuthenticated) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/file/list?page=${page}&sort=${sortOrder}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (page === 0) {
            setFiles(data.files);
          } else {
            setFiles(prev => [...prev, ...data.files]);
          }
          
          // If we got fewer than 10 files, there are no more to load
          setHasMore(data.files.length === 10);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [user.isAuthenticated, page, sortOrder, uploading]);

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20MB limit');
      return;
    }

    setUploading(true);
    setCurrentUpload(file.name);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/file/upload', true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast.success('Document uploaded successfully');
          // Reset page to fetch new files list
          setPage(0); 
        } else {
          toast.error('Failed to upload document');
        }
        setUploading(false);
        setCurrentUpload('');
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      xhr.onerror = () => {
        toast.error('Failed to upload document');
        setUploading(false);
        setCurrentUpload('');
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
      setUploading(false);
      setCurrentUpload('');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel upload
  const cancelUpload = () => {
    // This would ideally cancel the upload request
    setUploading(false);
    setCurrentUpload('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Upload cancelled');
  };

  // Handle sort toggle
  const toggleSort = () => {
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setPage(0); // Reset to first page when changing sort order
  };

  // Handle load more files
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1 flex justify-between items-center">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
              <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 justify-end">
          {user.isAuthenticated && (
            <div className="text-sm text-gray-600">
              <div className="whitespace-nowrap">Good day, </div>
              <p className="font-bold whitespace-nowrap">{user.name}</p>
            </div>
          )}
          <LogoutButton />
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-black">
        <div className="bg-white shadow rounded-lg p-6">
          {/* First row with title and upload button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-gray-900">My Document</h2>
              {user.isAuthenticated && (
                <span className="ml-2 text-sm text-gray-500">Total {totalFiles}</span>
              )}
            </div>
            
            {/* Upload button, only if there are files */}
            {totalFiles > 0 && (
              <button 
                onClick={triggerFileInput}
                className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-md flex items-center transition-colors duration-300"
              >
                Upload Document
              </button>
            )}
          </div>

          {/* Content based on whether user has files */}
          {user.isAuthenticated ? (
            totalFiles > 0 ? (
              // Files list view
              <div>
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 border-b pb-2 mb-2 font-medium text-gray-700">
                  <div className="col-span-5">File Name</div>
                  <div className="col-span-3">Owner Name</div>
                  <div className="col-span-4 flex items-center">
                    <span>Last Updated Time</span>
                    <button 
                      onClick={toggleSort}
                      className="ml-1 focus:outline-none"
                    >
                      {sortOrder === 'ASC' ? <FaSortUp /> : <FaSortDown />}
                    </button>
                  </div>
                </div>

                {/* Files list */}
                <div className="space-y-2">
                  {files.map(file => (
                    <div 
                      key={file.id} 
                      className="grid grid-cols-12 gap-4 py-2 border-b hover:bg-gray-50 cursor-pointer text-black"
                      onClick={() => router.push(`/dashboard/view-pdf/${file.id}`)}
                    >
                      <div className="col-span-5 truncate flex items-center">
                        <FaFileAlt className="text-blue-500 mr-2" />
                        {file.name}
                      </div>
                      <div className="col-span-3 truncate">{file.owner} <span className="font-bold">{file.owner === user.name ? '(You)' : ''}</span></div>
                      <div className="col-span-4 truncate text-gray-500">
                        {formatDate(file.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more button */}
                {hasMore && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={loadMore}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Empty state
              <div className="text-center py-10">
                <div className="flex justify-center mb-4">
                  <FaFileAlt className="text-gray-400 text-5xl" />
                </div>
                <p className="text-gray-500 mb-6">There is no document found</p>
                <button 
                  onClick={triggerFileInput}
                  className="bg-yellow-400 hover:bg-yellow-500 px-6 py-2 rounded-md transition-colors duration-300"
                >
                  Upload Document
                </button>
              </div>
            )
          ) : (
            // Loading state
            <div className="text-center py-10">
              <p className="text-gray-500">Loading user data...</p>
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="application/pdf"
        className="hidden"
      />

      {/* Upload progress modal */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-black">
          <div className="bg-white rounded-lg w-96 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Uploading</span>
              <button 
                onClick={cancelUpload}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-2 truncate">{currentUpload}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-right mt-1 text-sm text-gray-500">
              {uploadProgress}%
            </div>
          </div>
        </div>
      )}

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