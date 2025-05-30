"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "@/libs/api/axios";

export default function SignUp() {
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

    if(fullName === "") {
      setEmptyFullName(true);
      isValid = false;
    }
    
    if(email === "") {
      setEmptyEmail(true);
      isValid = false;
    } else if(!email.includes("@") || !email.includes(".")) {
      setInvalidEmail(true);
      isValid = false;
    }
    
    if(password === "") {
      setEmptyPassword(true);
      isValid = false;
    } else if(password.length < 8) {
      setInvalidPassword(true);
      isValid = false;
    }
    
    if(confirmPassword === "") {
      setEmptyConfirmPassword(true);
      isValid = false;
    } else if(password !== confirmPassword) {
      setPasswordMismatch(true);
      isValid = false;
    }

    if (!acceptedTerms) {
      setTermsError(true);
      isValid = false;
    }

    if(isValid) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fullName,
            email,
            password
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        }
        
        const data = await response.json();
        console.log("Signup successful:", data);
        
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } catch (error: any) {
        
        if (error) {

          if (error.message.includes('already registered with email/password')) {
            setExistingEmail(true);
          }
          
          // // If the email is already used with Google
          if (error.message.includes('already registered with Google')) {
            setExistingGoogle(true);
          }
            
            // Generic conflict - redirect to signin
          // setTimeout(() => {
          //     router.push('/auth/signin');
          // }, 2000);
          return;
        }
        
        
      } finally {
        setIsLoading(false);
      }
    }
  };

  return <div className="flex h-screen w-full bg-[url('@/public/images/backgroundauth.png')] fixed bg-cover bg-center">
    {/* left div */}
    <div className="opacity-100 text-black absolute left-20 top-1/2 transform -translate-y-1/2 w-[300px] rounded-xl">
      <div className="w-full h-full rounded-xl">
        <div className="flex items-center bg-white w-[130px] rounded-xl p-2">
          <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
          <span className="text-xl font-bold text-black">DI-DSV</span>
        </div>
        <p>A world where document collaboration is </p>
        <p>fast, fun and easy</p>
      </div>
    </div>
    {/* right div */}
    <div className="bg-white w-1/4 text-black absolute right-20 top-1/2 transform -translate-y-1/2 rounded-xl p-10 justify-center items-center flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-[45px]">Sign Up </h1>
        <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
      </div>
      
      <button 
        onClick={() => window.location.href = '/api/auth/google'} 
        className="bg-white w-full text-gray-700 p-2 rounded-xl hover:bg-gray-100 cursor-pointer active:scale-95 transition-all duration-300 border border-gray-300 flex items-center justify-center gap-2 mt-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
        Continue With Google
      </button>

      <div className="flex items-center w-full my-4">
        <hr className="flex-grow border-gray-300" />
        <span className="px-3 text-gray-500 text-sm">or</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      {/* Full Name Field */}
      <div className="relative w-full mb-4">
        <label htmlFor="fullName" className="text-sm">Full Name</label>
        <input 
          type="text" 
          name="fullName" 
          id="fullName" 
          placeholder="Input full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={`w-full p-2 rounded-xl border-2 ${
            emptyFullName ? "border-red-500" : "border-gray-300"
          }`} 
        />
        {emptyFullName && <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
      </div>

      {/* Email Field */}
      <div className="relative w-full mb-4">
        <label htmlFor="email" className="text-sm">Email</label>
        <input 
          type="email" 
          name="email" 
          id="email" 
          placeholder="Input email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-2 rounded-xl border-2 ${
            invalidEmail || emptyEmail || existingEmail ? "border-red-500" : "border-gray-300"
          }`} 
        />
        {emptyEmail && <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
        {invalidEmail && <p className="text-red-500 text-xs mt-1">Invalid email address</p>}
        {existingEmail && <p className="text-red-500 text-xs mt-1">This email is already registered with email and password</p>}
        {existingGoogle && <p className="text-red-500 text-xs mt-1">This email is already registered with Google</p>}
      </div>

      {/* Password Field */}
      <div className="relative w-full mb-4">
        <label htmlFor="password" className="text-sm">Password</label>
        <div className="relative w-full">
          <input 
            type={showPassword ? "text" : "password"} 
            name="password" 
            id="password" 
            placeholder="Input password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-2 rounded-xl border-2 ${
              invalidPassword || emptyPassword || passwordMismatch ? "border-red-500" : "border-gray-300"
            }`} 
          />
          
          <button 
            type="button"
            onClick={() => setShowPassword(prevState => !prevState)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>
        </div>
        {emptyPassword && <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
        {invalidPassword && <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters long</p>}
        {passwordMismatch && <p className="text-red-500 text-xs mt-1">Password must be the same</p>}
      </div>

      {/* Confirm Password Field */}
      <div className="relative w-full mb-4">
        <label htmlFor="confirmPassword" className="text-sm">Re-confirm Password</label>
        <div className="relative w-full">
          <input 
            type={showConfirmPassword ? "text" : "password"} 
            name="confirmPassword" 
            id="confirmPassword" 
            placeholder="Re-confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full p-2 rounded-xl border-2 ${
              emptyConfirmPassword || passwordMismatch ? "border-red-500" : "border-gray-300"
            }`} 
          />
          
          <button 
            type="button"
            onClick={() => setShowConfirmPassword(prevState => !prevState)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>
        </div>
        {emptyConfirmPassword && <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
        {passwordMismatch && <p className="text-red-500 text-xs mt-1">Password must be the same</p>}
      </div>

      {/* Terms of Service Checkbox */}
      <div className="flex items-center w-full mb-2">
        <input
          type="checkbox"
          id="terms"
          checked={acceptedTerms}
          onChange={() => setAcceptedTerms(!acceptedTerms)}
          className="mr-2"
        />
        <label htmlFor="terms" className="text-sm select-none">
          I accept all <a href="/terms" target="_blank" className="font-bold">Terms of Service</a> and <a href="/privacy" target="_blank" className="font-bold">Privacy Policy</a>
        </label>
      </div>
      {termsError && <p className="text-red-500 text-xs mb-2">You must accept the Terms of Service and Privacy Policy</p>}

      <button 
        className={`bg-blue-500 w-full text-white p-2 rounded-xl hover:bg-blue-600 cursor-pointer active:scale-95 transition-all duration-300 mt-2 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`} 
        onClick={handleSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          'Sign Up'
        )}
      </button>
      
      <div className="flex items-center w-full justify-center h-10 relative top-5">
        <p className="text-gray-400">Already have an account? <Link href="/auth/signin" className="text-black hover:text-blue-600 cursor-pointer">Sign In</Link></p>
      </div>
    </div>
  </div>;
}
