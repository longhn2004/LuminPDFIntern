"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthInput from "./AuthInput";
import AuthGoogleButton from "./AuthGoogleButton";
import AuthDivider from "./AuthDivider";
import AuthCheckbox from "./AuthCheckbox";
import AuthErrorMessage from "./AuthErrorMessage";

export default function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validation states
  const [emptyFullName, setEmptyFullName] = useState(false);
  const [emptyEmail, setEmptyEmail] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [emptyPassword, setEmptyPassword] = useState(false);
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [emptyConfirmPassword, setEmptyConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [existingEmail, setExistingEmail] = useState(false);
  const [existingGoogle, setExistingGoogle] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const router = useRouter();

  const handleSignUp = async () => {
    // Reset all validation states
    setEmptyFullName(false);
    setEmptyEmail(false);
    setInvalidEmail(false);
    setEmptyPassword(false);
    setInvalidPassword(false);
    setEmptyConfirmPassword(false);
    setPasswordMismatch(false);
    setExistingEmail(false);
    setExistingGoogle(false);
    setTermsError(false);

    // Validation logic
    let isValid = true;

    if (fullName === "") {
      setEmptyFullName(true);
      isValid = false;
    }

    if (email === "") {
      setEmptyEmail(true);
      isValid = false;
    } else if (!email.includes("@") || !email.includes(".")) {
      setInvalidEmail(true);
      isValid = false;
    }

    if (password === "") {
      setEmptyPassword(true);
      isValid = false;
    } else if (password.length < 8) {
      setInvalidPassword(true);
      isValid = false;
    }

    if (confirmPassword === "") {
      setEmptyConfirmPassword(true);
      isValid = false;
    } else if (password !== confirmPassword) {
      setPasswordMismatch(true);
      isValid = false;
    }

    if (!acceptedTerms) {
      setTermsError(true);
      isValid = false;
    }

    if (isValid) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Registration failed");
        }

        const data = await response.json();
        console.log("Signup successful:", data);

        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } catch (error: any) {
        if (error) {
          if (error.message.includes("already registered with email/password")) {
            setExistingEmail(true);
          }
          if (error.message.includes("already registered with Google")) {
            setExistingGoogle(true);
          }
          return;
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-[45px]">Sign Up </h1>
        <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
      </div>
      <AuthGoogleButton />
      <AuthDivider />
      <AuthInput
        label="Full Name"
        name="fullName"
        placeholder="Input full name"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        error={emptyFullName ? "Mandatory field" : undefined}
      />
      <AuthInput
        label="Email"
        type="email"
        name="email"
        placeholder="Input email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={
          emptyEmail
            ? "Mandatory field"
            : invalidEmail
            ? "Invalid email address"
            : existingEmail
            ? "This email is already registered with email and password"
            : existingGoogle
            ? "This email is already registered with Google"
            : undefined
        }
      />
      <AuthInput
        label="Password"
        type="password"
        name="password"
        placeholder="Input password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={
          emptyPassword
            ? "Mandatory field"
            : invalidPassword
            ? "Password must be at least 8 characters long"
            : passwordMismatch
            ? "Password must be the same"
            : undefined
        }
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      <AuthInput
        label="Re-confirm Password"
        type="password"
        name="confirmPassword"
        placeholder="Re-confirm password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        error={
          emptyConfirmPassword
            ? "Mandatory field"
            : passwordMismatch
            ? "Password must be the same"
            : undefined
        }
        showPassword={showConfirmPassword}
        setShowPassword={setShowConfirmPassword}
      />
      <AuthCheckbox
        id="terms"
        checked={acceptedTerms}
        onChange={() => setAcceptedTerms(!acceptedTerms)}
        label={
          <>
            I accept all <a href="/terms" target="_blank" className="font-bold">Terms of Service</a> and <a href="/privacy" target="_blank" className="font-bold">Privacy Policy</a>
          </>
        }
        error={termsError ? "You must accept the Terms of Service and Privacy Policy" : undefined}
      />
      <button
        className={`bg-blue-500 w-full text-white p-2 rounded-xl hover:bg-blue-600 cursor-pointer active:scale-95 transition-all duration-300 mt-2 flex justify-center items-center ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        onClick={handleSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          "Sign Up"
        )}
      </button>
      <div className="flex items-center w-full justify-center h-10 relative top-5">
        <p className="text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-black hover:text-blue-600 cursor-pointer">Sign In</Link>
        </p>
      </div>
    </>
  );
} 