"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VerifyLayout, StatusCard, SuccessIcon } from "@/components/auth";

export default function VerifySuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  // Use a simple countdown timer that shows the seconds remaining
  useEffect(() => {
    // Start countdown effect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Only redirect when countdown reaches 0
          router.push('/dashboard/document-list');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, [router]);

  const handleGoToDocuments = () => {
    router.push("/dashboard/document-list");
  };

  const buttons = (
    <div className="flex flex-col items-center">
      <button 
        onClick={handleGoToDocuments}
        className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
      >
        Go To My Document
      </button>
      <p className="text-gray-400 mt-4">
        Redirecting to dashboard in {countdown} seconds...
      </p>
    </div>
  );

  return (
    <VerifyLayout>
      <StatusCard
        icon={<SuccessIcon />}
        title="Well done!"
        titleSize="text-3xl"
        message={<span className="text-lg">You have verified your email successfully.</span>}
        buttons={buttons}
      />
    </VerifyLayout>
  );
}
