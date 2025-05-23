"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "@/libs/api/axios";

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

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

  const verifyToken = async (token: string) => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Verification failed');
      }
      
      // Redirect to success page which will then redirect to dashboard after 3 seconds
      router.push('/auth/verify-success');
    } catch (error: any) {
      console.error("Verification error:", error);
      setVerificationError(error.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendDisabled || !email) return;
    
    setResendDisabled(true);
    setResendCooldown(60);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend verification email');
      }
      
      console.log("Verification email resent to:", email);
    } catch (error) {
      console.error("Error resending verification email:", error);
    }
  };

  if (token && verifying) {
    return (
      <div className="flex flex-col h-screen fixed w-full">
        <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1">
          <div className="container mx-auto">
            <div className="flex items-center">
              <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
                <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center items-center bg-white">
          <div className="mx-4 bg-white rounded-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg className="animate-spin h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Verifying your email</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    );
  }

  if (token && verificationError) {
    return (
      <div className="flex flex-col h-screen fixed w-full">
        <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1">
          <div className="container mx-auto">
            <div className="flex items-center">
              <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
                <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center items-center bg-white">
          <div className="mx-4 bg-white rounded-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{verificationError}</p>
            <button 
              onClick={() => router.push("/auth/signin")}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-all duration-300"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen fixed w-full">
      <div className="w-full bg-white p-4 border-b border-gray-200 shadow-md z-1">
        <div className="container mx-auto">
          <div className="flex items-center">
              <button onClick={() => router.push("/auth/signin")} className="cursor-pointer">
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
