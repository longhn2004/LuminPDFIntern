"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { clearUser } from "@/redux/features/userSlice";
import { useAppTranslations } from "@/hooks/useTranslations";

interface LogoutButtonProps {
  onLogoutStart?: () => void;
  onLogoutSuccess?: () => void;
  onLogoutError?: (error: Error) => void;
  className?: string;
  variant?: 'default' | 'minimal' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  redirectTo?: string;
}

// Logout icon SVG component
const LogoutIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    aria-hidden="true"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
    />
  </svg>
);

// Loading spinner component
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <span 
    className={`${className} border-2 border-white border-t-transparent rounded-full animate-spin`}
    aria-hidden="true"
  />
);

// Style variants
const BUTTON_VARIANTS = {
  default: "bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors duration-300 flex justify-center items-center active:scale-95",
  minimal: "text-red-600 hover:text-red-700 hover:bg-red-50 py-2 px-3 rounded transition-colors duration-200 flex items-center whitespace-nowrap",
  'icon-only': "text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors duration-200 flex items-center justify-center"
} as const;

const BUTTON_SIZES = {
  sm: "text-sm py-1 px-3",
  md: "text-base py-2 px-4", 
  lg: "text-lg py-3 px-6"
} as const;

/**
 * LogoutButton component provides a button to log out the current user
 * with customizable styling and behavior
 */
const LogoutButton: React.FC<LogoutButtonProps> = ({
  onLogoutStart,
  onLogoutSuccess,
  onLogoutError,
  className = "",
  variant = 'default',
  size = 'md',
  redirectTo = '/auth/signin'
}) => {
  const translations = useAppTranslations();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    onLogoutStart?.();

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status: ${response.status}`);
      }

      // Clear user data from Redux store
      dispatch(clearUser());

      onLogoutSuccess?.();

      // Redirect to specified page
      router.push(redirectTo);
    } catch (error) {
      const logoutError = error instanceof Error ? error : new Error('Unknown logout error');
      console.error('Logout error:', logoutError);
      
      onLogoutError?.(logoutError);
      
      // Even if there's an error, clear the store and redirect
      dispatch(clearUser());
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, router, redirectTo, onLogoutStart, onLogoutSuccess, onLogoutError]);

  const baseClasses = `${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`;
  const showText = variant !== 'icon-only';

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoading}
      className={baseClasses + " cursor-pointer"}
      aria-label={isLoading ? translations.dashboard("logOut") : translations.dashboard("logOut")}
      title={translations.dashboard("logOut")}
    >
      {isLoading ? (
        <>
          <LoadingSpinner className="mr-2" />
          {showText && translations.common("loading")}
        </>
      ) : (
        <>
          <LogoutIcon className={showText ? "h-5 w-5 mr-2" : "h-5 w-5"} />
          {showText && translations.dashboard("logOut")}
        </>
      )}
    </button>
  );
};

export default LogoutButton; 