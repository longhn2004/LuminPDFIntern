"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { VerifyLayout, StatusCard, ErrorIcon } from "@/components/auth";

export default function VerifyError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const errorMessage = searchParams.get("message") || t('auth.verificationFailedMessage');

  const buttons = (
    <div className="flex space-x-4">
      <button 
        onClick={() => router.push("/auth/signin")}
        className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
      >
        {t('auth.backToSignIn')}
      </button>
      <button 
        onClick={() => router.push("/auth/signup")}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 active:scale-95"
      >
        {t('auth.signup')}
      </button>
    </div>
  );

  return (
    <VerifyLayout>
      <StatusCard
        icon={<ErrorIcon />}
        title={t('auth.verificationFailed')}
        titleSize="text-3xl"
        message={<span className="text-lg">{errorMessage}</span>}
        buttons={buttons}
      />
    </VerifyLayout>
  );
} 