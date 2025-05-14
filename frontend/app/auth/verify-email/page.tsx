"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendDisabled) return;
    
    setResendDisabled(true);
    setResendCooldown(60);
    
    try {
      // Mock API call - in a real application, this would be an actual API call
      // await fetch('/api/auth/resend-verification', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      console.log("Verification email resent to:", email);
      // You could show a success message here
    } catch (error) {
      console.error("Error resending verification email:", error);
      // Handle error state
    }
  };

  return (
    <div className="flex flex-col h-screen fixed w-full">
      {/* Top navbar with logo */}
      <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => router.push("signin")} className="cursor-pointer">
              <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
            </button>
            {/* <span className="text-xl font-bold text-black ml-2">DI-DSV</span> */}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex justify-center items-center bg-white">
        <div className="mx-4 bg-white rounded-lg p-8 text-center w-1/2">
          {/* Mail icon */}
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Verify your email address</h1>
          
          {/* Verification message */}
          <p className="text-gray-600 mb-6">
            We've just sent a verification email to <span className="font-bold">{email}</span>. Please check your inbox.
          </p>
          
          {/* Resend link */}
          <div className="mt-8 flex justify-center">
            <p className="text-gray-600">Didn't receive an email?&nbsp;</p>
            <button 
              onClick={handleResendEmail}
              disabled={resendDisabled}
              className="text-blue-600 hover:underline focus:outline-none"
            >
               Resend Verification Link
              
            </button>
            {resendDisabled && resendCooldown > 0 && (
            <span className="ml-2 text-gray-500">({resendCooldown}s)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
