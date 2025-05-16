"use client";

import React, { useEffect } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setUser } from '@/redux/features/userSlice';
import { useRouter } from 'next/navigation';

function DocumentList() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log(data);
          // Update Redux store with user data
          dispatch(setUser({
            email: data.email,
            isEmailVerified: data.isEmailVerified,
            name: data.name || 'User' // Fallback if name is not available
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    // Only fetch if not already authenticated (to reduce API calls)
    if (!user.isAuthenticated) {
      fetchUserData();
    }
  }, [dispatch, user.isAuthenticated]);

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
            <div className="text-sm text-gray-600 "> <div className="whitespace-nowrap">Good day, </div> <p className="font-bold whitespace-nowrap">{user.name}</p>
            </div>
          )}
          <LogoutButton />
        </div>
        
      </div>
      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Your Documents</h2>
          {user.isAuthenticated ? (
            <p className="mt-4 text-gray-500">
              No documents yet. Documents you create or upload will appear here.
            </p>
          ) : (
            <p className="mt-4 text-gray-500">Loading user data...</p>
          )}
          {/* Add document list or upload functionality here */}
        </div>
      </main>
    </div>
  );
}

export default DocumentList;