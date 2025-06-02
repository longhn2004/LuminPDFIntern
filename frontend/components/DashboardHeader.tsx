"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUser } from "@/redux/features/userSlice";
import LogoutButton from "./LogoutButton";
import Avatar from "./Avatar";

const TIME_BASED_GREETINGS = {
  morning: "Good morning",
  afternoon: "Good afternoon", 
  evening: "Good evening"
} as const;

interface DashboardHeaderProps {
  className?: string;
  onLogoClick?: () => void;
  showGreeting?: boolean;
}

/**
 * Get time-based greeting based on current hour
 */
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) return TIME_BASED_GREETINGS.morning;
  if (hour < 17) return TIME_BASED_GREETINGS.afternoon;
  return TIME_BASED_GREETINGS.evening;
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

/**
 * DashboardHeader component provides navigation and user information
 * at the top of dashboard pages
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  className = "",
  onLogoClick,
  showGreeting = true
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user);
  const router = useRouter();
  
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  
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
        const data = await response.json();
        dispatch(setUser({
          email: data.email,
          isEmailVerified: data.isEmailVerified,
          name: data.name || 'User',
          isAuthenticated: true
        }));
      } else {
        console.warn('User not authenticated or session expired');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
  const greetingText = `${greeting}, ${userName}`;

  return (
    <header className={`w-full bg-white border-b border-gray-200 shadow-md z-10 ${className}`}>
      <div className="flex justify-between items-center p-4">
        
        {/* Logo Section */}
        <div className="flex items-center">
          <button 
            onClick={handleLogoClick} 
            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Go to dashboard"
          >
            <img 
              src="/images/dsvlogo.png" 
              alt="DI-DSV Logo" 
              className="h-10 w-10" 
            />
          </button>
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
                aria-label="User menu"
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