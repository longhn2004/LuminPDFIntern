import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { useEffect, useRef, useState } from "react";
import { setUser } from "@/redux/features/userSlice";
import Avatar from "./Avatar";

export default function DashboardHeader() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.user);
    const router = useRouter();
    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Function to get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowLogoutMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
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

    return (
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
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              <div className="text-sm text-gray-600">
                <div className="whitespace-nowrap">
                  {getTimeBasedGreeting()}, {user.name}
                </div>
              </div>
              <button 
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Avatar name={user.name || 'User'} size="md" />
              </button>
              {showLogoutMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                  <LogoutButton />
                </div>
              )}
            </div>
        )}
        </div>
    </div>
    )
 }