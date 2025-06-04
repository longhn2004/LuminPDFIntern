"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import { VerifyLayout, StatusCard, SuccessIcon } from "@/components/auth";

export default function VerifySuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const t = useTranslations();

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []); // Remove router from dependencies

  // Separate effect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      router.push('/dashboard/document-list');
    }
  }, [countdown, router]);

  const handleGoToDocuments = () => {
    router.push("/dashboard/document-list");
  };

  const buttons = (
    <div className="flex flex-col items-center">
      <button 
        onClick={handleGoToDocuments}
        className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
      >
        {t('auth.goToMyDocuments')}
      </button>
      <p className="text-gray-400 mt-4">
        {t('auth.redirectingToDashboard', { seconds: countdown })}
      </p>
    </div>
  );

  return (
    <VerifyLayout>
      <StatusCard
        icon={<SuccessIcon />}
        title={t('auth.wellDone')}
        titleSize="text-3xl"
        message={<span className="text-lg">{t('auth.emailVerifiedSuccessfully')}</span>}
        buttons={buttons}
      />
    </VerifyLayout>
  );
}
