"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { VerifyLayout, StatusCard, ErrorIcon } from "@/components/auth";

export default function VerifyError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "Verification failed. Please try again.";

  const buttons = (
    <div className="flex space-x-4">
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
  );

  return (
    <VerifyLayout>
      <StatusCard
        icon={<ErrorIcon />}
        title="Verification Failed"
        titleSize="text-3xl"
        message={<span className="text-lg">{errorMessage}</span>}
        buttons={buttons}
      />
    </VerifyLayout>
  );
} 