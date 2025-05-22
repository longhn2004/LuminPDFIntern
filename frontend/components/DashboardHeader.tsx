import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { useEffect, useRef } from "react";
import { setUser } from "@/redux/features/userSlice";

export default function DashboardHeader() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.user);
    const router = useRouter();
    
    
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
            <div className="text-sm text-gray-600">
            <div className="whitespace-nowrap">Good day, </div>
            <p className="font-bold whitespace-nowrap">{user.name}</p>
            </div>
        )}
        <LogoutButton />
        </div>
    </div>
    )
 }