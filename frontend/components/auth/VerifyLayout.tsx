"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import LanguageSwitch from '../LanguageSwitch';

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
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
              <Image src="/images/dsvlogo.png" alt="Logo" width={40} height={40} className="h-10 w-10" />
            </button>
            
            {/* Language Switch on the right */}
            <div className="bg-white rounded-lg px-3 py-2">
              <LanguageSwitch variant="light" />
            </div>
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