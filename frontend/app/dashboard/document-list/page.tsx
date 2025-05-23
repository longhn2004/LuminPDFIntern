"use client";

import React, { useEffect, useState, useRef } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setUser } from '@/redux/features/userSlice';
import { useRouter } from 'next/navigation';
import { FaSort, FaSortUp, FaSortDown, FaFileAlt, FaUpload } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import DashboardHeader from '@/components/DashboardHeader';
import Avatar from '@/components/Avatar';
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
  // const dispatch = useAppDispatch();
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
  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     try {
  //       const response = await fetch('/api/auth/me', {
  //         credentials: 'include',
  //       });
  //       if (response.ok) {
  //         const data = await response.json();
  //         dispatch(setUser({
  //           email: data.email,
  //           isEmailVerified: data.isEmailVerified,
  //           name: data.name || 'User',
  //           isAuthenticated: true
  //         }));
  //       }
  //     } catch (error) {
  //       console.error('Error fetching user data:', error);
  //     }
  //   };

  //   if (!user.isAuthenticated) {
  //     fetchUserData();
  //   }
  // }, [dispatch, user.isAuthenticated]);

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
    <div className="h-screen bg-white fixed inset-0">
      <DashboardHeader />

      {/* Main */}
      <main className="mx-auto  text-black h-100%">
        <div className="bg-white p-6 h-100%">
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
                className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-md flex items-center transition-colors duration-300"
              >
                {/* Download icon */}
                <FaUpload className="mr-2" />
                Upload Document
              </button>
            )}
          </div>

          {/* Content based on whether user has files */}
          {user.isAuthenticated ? (
            totalFiles > 0 ? (
              // Files table view
              <div className="w-full overflow-y-auto" style={{ height: '75vh' }}>
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden border-collapse">
                  {/* Table header */}
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 border-l-2 border-gray-200">
                        File Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-48">
                        Document Owner
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-44 border-r-2 border-gray-200">
                        <div className="flex items-center">
                          <span>Last Updated</span>
                          <button 
                            onClick={toggleSort}
                            className="ml-2 focus:outline-none hover:text-gray-900"
                          >
                            {sortOrder === 'ASC' ? <FaSortUp /> : <FaSortDown />}
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  {/* Table body */}
                  <tbody>
                    {files.map(file => (
                      <tr 
                        key={file.id} 
                        className="hover:bg-gray-50 cursor-pointer border border-gray-200 transition-colors"
                        onClick={() => router.push(`/dashboard/viewpdf/${file.id}`)}
                      >
                        <td className="py-3 px-4 border-b-2 border-gray-200">
                          <div className="flex items-center">
                            {/* <FaFileAlt className="text-blue-500 mr-3 flex-shrink-0" /> */}
                            <span className="truncate">{file.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border-b-2 border-gray-200">
                          <div className="flex items-center">
                            <Avatar name={file.owner} size="sm" className="mr-3 flex-shrink-0" />
                            <span className="truncate">
                              {file.owner}
                              {file.owner === user.name && (
                                <span className="text-gray-500 font-normal ml-1">(You)</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 border-r-2 border-b-2 border-gray-200">
                          {formatDate(file.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Load more button */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button 
                      onClick={loadMore}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
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