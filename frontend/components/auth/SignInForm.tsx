"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import AuthInput from "./AuthInput";
import AuthGoogleButton from "./AuthGoogleButton";
import AuthDivider from "./AuthDivider";
import AuthErrorMessage from "./AuthErrorMessage";
import { HTTP_STATUS } from "@/libs/constants/httpStatus";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [emptyEmail, setEmptyEmail] = useState(false);
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [emptyPassword, setEmptyPassword] = useState(false);
  const [incorrectEmailOrPassword, setIncorrectEmailOrPassword] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationStatus = searchParams.get("verification");
  const t = useTranslations();

  useEffect(() => {
    if (verificationStatus === "required") {
      setVerificationMessage(t('auth.verificationRequired'));
    } else if (verificationStatus === "success") {
      setVerificationMessage(t('auth.verificationSuccess'));
    } else if (verificationStatus === "conflictgoogle") {
      setVerificationMessage(t('auth.conflictGoogle'));
    } else if (verificationStatus === "conflictemail") {
      setVerificationMessage(t('auth.conflictEmail'));
    }
  }, [verificationStatus, t]);

  const handleSignIn = async () => {
    setInvalidEmail(false);
    setEmptyEmail(false);
    setInvalidPassword(false);
    setEmptyPassword(false);
    setIncorrectEmailOrPassword(false);
    setVerificationMessage("");
    let isValid = true;

    if (email === "") {
      setEmptyEmail(true);
      isValid = false;
    } 
    if (password === "") {
      setEmptyPassword(true);
      isValid = false;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setInvalidEmail(true);
      isValid = false;
    } 

    if (isValid) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw { response: { status: response.status, data } };
        }

        router.push("/dashboard/document-list");
      } catch (error: unknown) {
        const errorObj = error as { response?: { status: number; data: { message: string } } };
        if (errorObj.response) {
          // If you want to use HTTP_STATUS, import it above
          if (
            errorObj.response.status === HTTP_STATUS.UNAUTHORIZED &&
            errorObj.response.data.message === "Email not verified"
          ) {
            router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }
        }
      setIncorrectEmailOrPassword(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-[45px]">{t('auth.signin')} </h1>
        <Image src="/images/dsvlogo.png" alt="Logo" width={40} height={40} className="h-10 w-10" />
      </div>
      <AuthGoogleButton />
      <AuthDivider />
      <AuthInput
        label={t('auth.email')}
        type="email"
        name="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={emptyEmail ? t('auth.mandatoryField') : invalidEmail ? t('auth.invalidEmailAddress') : undefined}
      />
      <AuthInput
        label={t('auth.password')}
        type="password"
        name="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={emptyPassword ? t('auth.mandatoryField') : invalidPassword ? t('auth.passwordMinLength') : undefined}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      <AuthErrorMessage message={incorrectEmailOrPassword ? t('auth.incorrectEmailOrPassword') : verificationMessage} />
      <button
        className={`bg-blue-500 w-full text-white p-2 rounded-xl hover:bg-blue-600 cursor-pointer active:scale-95 transition-all duration-300 mt-2 flex justify-center items-center ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          t('auth.signin')
        )}
      </button>
      <div className="flex items-center w-full justify-center h-10 relative top-5">
        <p className="text-gray-400">
          {t('auth.dontHaveAccount')}{' '}
          <Link href="/auth/signup" className="text-black hover:text-blue-600 cursor-pointer">{t('auth.signup')}</Link>
        </p>
      </div>
    </>
  );
} 