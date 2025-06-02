"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationStatus = searchParams.get("verification");

  useEffect(() => {
    if (verificationStatus === "required") {
      setVerificationMessage("Please verify your email before signing in.");
    } else if (verificationStatus === "success") {
      setVerificationMessage("Email verified successfully! You can now sign in.");
    } else if (verificationStatus === "conflictgoogle") {
      setVerificationMessage("You have already signed up that email with Google.");
    } else if (verificationStatus === "conflictemail") {
      setVerificationMessage("You have already signed up that email using email and password.");
    }
  }, [verificationStatus]);

  const handleSignIn = async () => {
    setInvalidEmail(false);
    setEmptyEmail(false);
    setInvalidPassword(false);
    setEmptyPassword(false);
    setIncorrectEmailOrPassword(false);
    setVerificationMessage("");

    if (email === "") {
      setEmptyEmail(true);
      if (password === "") {
        setEmptyPassword(true);
      }
      return;
    } else if (password === "") {
      setEmptyPassword(true);
      return;
    } else if (!email.includes("@") || !email.includes(".")) {
      setInvalidEmail(true);
      return;
    } else if (password.length < 8) {
      setInvalidPassword(true);
      return;
    }

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
    } catch (error: any) {
      if (error.response) {
        // If you want to use HTTP_STATUS, import it above
        if (
          error.response.status === HTTP_STATUS.UNAUTHORIZED &&
          error.response.data.message === "Email not verified"
        ) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
      }
      setIncorrectEmailOrPassword(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-[45px]">Sign In </h1>
        <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
      </div>
      <AuthGoogleButton />
      <AuthDivider />
      <AuthInput
        label="Email"
        type="email"
        name="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={emptyEmail ? "Mandatory field" : invalidEmail ? "Invalid email address" : undefined}
      />
      <AuthInput
        label="Password"
        type="password"
        name="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={emptyPassword ? "Mandatory field" : invalidPassword ? "Password must be at least 8 characters" : undefined}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      <AuthErrorMessage message={incorrectEmailOrPassword ? "Incorrect email or password" : verificationMessage} />
      <button
        className="bg-blue-500 w-full text-white p-2 rounded-xl hover:bg-blue-600 cursor-pointer active:scale-95 transition-all duration-300 mt-2"
        onClick={handleSignIn}
      >
        Sign In
      </button>
      <div className="flex items-center w-full justify-center h-10 relative top-5">
        <p className="text-gray-400">
          Do not have an account?{' '}
          <Link href="/auth/signup" className="text-black hover:text-blue-600 cursor-pointer">Sign Up</Link>
        </p>
      </div>
    </>
  );
} 