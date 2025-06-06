"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUser } from "@/redux/features/userSlice";
import LogoutButton from "./LogoutButton";
import Avatar from "./Avatar";
import LanguageSwitch from "./LanguageSwitch";
import { useAppTranslations } from "@/hooks/useTranslations";

/**
 * Get time-based greeting key based on current hour
 */
const getTimeBasedGreetingKey = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) return "dashboard.goodMorning";
  if (hour < 17) return "dashboard.goodAfternoon";
  return "dashboard.goodEvening";
};

/**
 * Custom hook for handling outside clicks
 */
const useOutsideClick = (callback: () => void) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback]);

  return ref;
};

interface DashboardHeaderProps {
  className?: string;
  onLogoClick?: () => void;
  showGreeting?: boolean;
}

/**
 * DashboardHeader component provides navigation and user information
 * at the top of dashboard pages
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  className = "",
  onLogoClick,
  showGreeting = true
}) => {
  const translations = useAppTranslations();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user);
  const router = useRouter();
  
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const greetingKey = useMemo(() => getTimeBasedGreetingKey(), []);
  
  const closeDropdown = useCallback(() => {
    setShowLogoutMenu(false);
  }, []);

  const dropdownRef = useOutsideClick(closeDropdown);

  // Fetch user data on mount if not authenticated
  const fetchUserData = useCallback(async () => {
    if (user.isAuthenticated || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          dispatch(setUser({
            email: data.email,
            isEmailVerified: data.isEmailVerified,
            name: data.name || 'User',
            isAuthenticated: true
          }));
        } else {
          console.warn('Expected JSON response but received:', contentType);
          console.warn('Response text:', await response.text());
        }
      } else {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.warn('User not authenticated:', errorData.message || 'Session expired');
        } else {
          console.warn('User not authenticated or session expired. Non-JSON response:', response.status);
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        console.error('Backend returned HTML instead of JSON. Check if backend is running and NEXT_APP_BACKEND_URL is configured correctly.');
        console.error('Current backend URL:', process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000/api');
      } else {
        console.error('Error fetching user data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, user.isAuthenticated, isLoading]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleLogoClick = useCallback(() => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      router.push("/dashboard/document-list");
    }
  }, [router, onLogoClick]);

  const toggleLogoutMenu = useCallback(() => {
    setShowLogoutMenu(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowLogoutMenu(false);
    }
  }, []);

  const userName = user.name || 'User';
  const greetingText = `${translations.t(greetingKey)}, ${userName}`;

  return (
    <header className={`w-full bg-white border-b border-gray-200 shadow-md z-10 ${className}`}>
      <div className="flex justify-between items-center p-4">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogoClick} 
            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label={translations.dashboard("goToDashboard")}
          >
            <Image 
              src="/images/dsvlogo.png" 
              alt="DI-DSV Logo" 
              width={40}
              height={40}
              className="h-10 w-10" 
            />
          </button>
          
          {/* Language Switch */}
          <div className="bg-white rounded-lg px-3 py-2">
            <LanguageSwitch variant="light" />
          </div>
        </div>

        {/* User Section */}
        {user.isAuthenticated && (
          <div className="flex items-center gap-4">
            
            {/* Greeting */}
            {showGreeting && (
              <div className="hidden sm:block text-sm text-gray-600">
                <span className="whitespace-nowrap">
                  {greetingText}
                </span>
              </div>
            )}

            {/* User Avatar with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={toggleLogoutMenu}
                onKeyDown={handleKeyDown}
                className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                aria-label={translations.dashboard("userMenu")}
                aria-expanded={showLogoutMenu}
                aria-haspopup="true"
                id="user-menu-button"
              >
                <Avatar 
                  name={userName} 
                  size="md" 
                />
              </button>

              {/* Dropdown Menu */}
              {showLogoutMenu && (
                <div 
                  className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <LogoutButton 
                    variant="minimal"
                    size="sm"
                    onLogoutSuccess={closeDropdown}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !user.isAuthenticated && (
          <div className="flex items-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;