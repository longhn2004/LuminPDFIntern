"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface AuthLayoutProps {
  children: React.ReactNode;
  rightWidthClass?: string;
  leftContent?: React.ReactNode;
}

export default function AuthLayout({
  children,
  rightWidthClass = "w-1/3",
  leftContent,
}: AuthLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full bg-[url('@/public/images/backgroundauth.png')] fixed bg-cover bg-center">
      {/* left div */}
      <div className="opacity-100 text-black absolute left-20 top-1/2 transform -translate-y-1/2 w-[300px] rounded-xl">
        <div className="w-full h-full rounded-xl">
          {leftContent || (
            <>
              <div className="flex items-center bg-white w-[130px] rounded-xl p-2">
                <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
                <span className="text-xl font-bold text-black">DI-DSV</span>
              </div>
              <p className="text-white">A world where document collaboration is </p>
              <p className="text-white">fast, fun and easy</p>
            </>
          )}
        </div>
      </div>
      {/* right div */}
      <div className={`bg-white ${rightWidthClass} text-black absolute right-0 top-1/2 transform -translate-y-1/2 p-10 justify-center items-center flex flex-col h-full`}>
        {children}
      </div>
    </div>
  );
} 