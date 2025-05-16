"use client";

import React, { useEffect } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setUser } from '@/redux/features/userSlice';

function DocumentList() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10 mr-2" />
            <h1 className="text-xl font-bold text-gray-900">DI-DSV Documents</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user.isAuthenticated && (
              <div className="text-sm text-gray-600 mr-4">
                Signed in as: <span className="font-medium">{user.email}</span>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      
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