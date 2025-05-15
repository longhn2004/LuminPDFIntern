"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VerifySuccess() {
  const router = useRouter();

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, [router]);

  const handleGoToDocuments = () => {
    router.push("/dashboard/document-list");
  };

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
          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Well done!</h1>
          
          {/* Success message */}
          <p className="text-gray-600 mb-8 text-lg">
            You have verified your email successfully.
          </p>
          
          {/* Go to documents button */}
          <div className="mt-8 flex justify-center">
            <button 
              onClick={handleGoToDocuments}
              className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
            >
              Go To My Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
