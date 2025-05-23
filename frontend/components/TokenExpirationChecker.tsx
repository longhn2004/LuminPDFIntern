"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAppDispatch } from '@/redux/hooks';
import { clearUser } from '@/redux/features/userSlice';
import { isTokenExpired } from '@/libs/auth/tokenUtils';

export default function TokenExpirationChecker() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // Function to handle token expiration
    const checkAndHandleTokenExpiration = () => {
      const token = Cookies.get('access_token');
      
      // If no token or token is expired
      if (!token || isTokenExpired()) {
        // If there was a token (user was logged in), clear it
        if (token) {
          // Clear the token
          Cookies.remove('access_token');
          
          // Clear user from Redux
          dispatch(clearUser());
          
          // Redirect to login
          router.push('/auth/signin');
        }
      }
    };
    
    // Check immediately on component mount
    checkAndHandleTokenExpiration();
    
    // Set up interval to check periodically (every minute)
    const intervalId = setInterval(checkAndHandleTokenExpiration, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [router, dispatch]);
  
  // This component doesn't render anything
  return null;
} 