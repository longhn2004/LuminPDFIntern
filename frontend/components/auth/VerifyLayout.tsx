"use client";

import { useRouter } from "next/navigation";

interface VerifyLayoutProps {
  children: React.ReactNode;
}

export default function VerifyLayout({ children }: VerifyLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen fixed w-full">
      {/* Top navbar with logo */}
      <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
              <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex justify-center items-center bg-white">
        {children}
      </div>
    </div>
  );
} 