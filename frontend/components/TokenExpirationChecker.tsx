"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAppDispatch } from '@/redux/hooks';
import { clearUser } from '@/redux/features/userSlice';
import { isTokenExpired } from '@/libs/auth/tokenUtils';

// Check interval in milliseconds (1 minute)
const TOKEN_CHECK_INTERVAL = 10000;

interface TokenExpirationCheckerProps {
  onTokenExpired?: () => void;
  redirectUrl?: string;
  checkInterval?: number;
}

/**
 * TokenExpirationChecker monitors token expiration and handles automatic logout
 * when tokens are expired or invalid
 */
const TokenExpirationChecker: React.FC<TokenExpirationCheckerProps> = ({
  onTokenExpired,
  redirectUrl = '/auth/signin',
  checkInterval = TOKEN_CHECK_INTERVAL
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleTokenExpiration = useCallback(() => {
    try {
      const token = Cookies.get('access_token');
      
      // If no token or token is expired
      if (!token || isTokenExpired()) {
        // Only handle expiration if there was a token (user was logged in)
        if (token) {
          console.warn('Token expired, logging out user');
          
          // Clear the token
          Cookies.remove('access_token');
          
          // Clear user from Redux
          dispatch(clearUser());
          
          // Call custom callback if provided
          onTokenExpired?.();
          
          // Redirect to signin
          router.push(redirectUrl);
        }
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  }, [dispatch, router, redirectUrl, onTokenExpired]);

  useEffect(() => {
    // Check immediately on component mount
    handleTokenExpiration();
    
    // Set up interval to check periodically
    intervalRef.current = setInterval(handleTokenExpiration, checkInterval);
    
    // Clean up interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleTokenExpiration, checkInterval]);

  // This component doesn't render anything
  return null;
};

export default TokenExpirationChecker; 