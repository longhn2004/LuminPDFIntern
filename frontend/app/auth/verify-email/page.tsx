"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { VerifyLayout, StatusCard, LoadingSpinner, ErrorIcon, MailIcon } from "@/components/auth";

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const t = useTranslations();
  
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
      
      router.push('/auth/verify-success');
    } catch (error: any) {
      console.error("Verification error:", error);
      setVerificationError(error.message || t('auth.verificationFailedMessage'));
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

  // Loading state during verification
  if (token && verifying) {
    return (
      <VerifyLayout>
        <StatusCard
          icon={<LoadingSpinner />}
          title={t('auth.verifyingEmail')}
          message={t('auth.verifyingEmailMessage')}
        />
      </VerifyLayout>
    );
  }

  // Error state after failed verification
  if (token && verificationError) {
    return (
      <VerifyLayout>
        <StatusCard
          icon={<ErrorIcon />}
          title={t('auth.verificationFailed')}
          message={verificationError}
          buttons={
            <button 
              onClick={() => router.push("/auth/signin")}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-all duration-300"
            >
              {t('auth.backToSignIn')}
            </button>
          }
        />
      </VerifyLayout>
    );
  }

  // Default state - waiting for email verification
  const resendButton = (
    <div className="flex justify-center">
      <p className="text-gray-600">{t('auth.didntReceiveEmail')}&nbsp;</p>
      <button 
        onClick={handleResendEmail}
        disabled={resendDisabled}
        className="text-blue-600 hover:underline focus:outline-none"
      >
        {t('auth.resendVerificationLink')}
      </button>
      {resendDisabled && resendCooldown > 0 && (
        <span className="ml-2 text-gray-500">({resendCooldown}s)</span>
      )}
    </div>
  );

  return (
    <VerifyLayout>
      <StatusCard
        icon={<MailIcon />}
        title={t('auth.verifyEmailTitle')}
        message={
          <>
            {t('auth.verifyEmailMessage', { email: email || '' })}
          </>
        }
        buttons={resendButton}
      />
    </VerifyLayout>
  );
}
