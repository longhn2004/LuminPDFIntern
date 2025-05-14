"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "Verification failed. Please try again.";

  return (
    <div className="flex flex-col h-screen fixed w-full">
      {/* Top navbar with logo */}
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
          {/* Error icon */}
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Verification Failed</h1>
          
          {/* Error message */}
          <p className="text-gray-600 mb-8 text-lg">
            {errorMessage}
          </p>
          
          {/* Buttons */}
          <div className="mt-8 flex justify-center space-x-4">
            <button 
              onClick={() => router.push("/auth/signin")}
              className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
            >
              Back to Sign In
            </button>
            <button 
              onClick={() => router.push("/auth/signup")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 