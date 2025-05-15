"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [emptyEmail, setEmptyEmail] = useState(false);
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [emptyPassword, setEmptyPassword] = useState(false);
  const [incorrectEmailOrPassword, setIncorrectEmailOrPassword] = useState(false);
  const router = useRouter();


  const searchParams = useSearchParams();
  const verificationStatus = searchParams.get("verification");
  const [verificationMessage, setVerificationMessage] = useState("");
  
  
  useEffect(() => {
    if (verificationStatus === "required") {
      setVerificationMessage("Please verify your email before signing in.");
    } else if (verificationStatus === "success") {
      setVerificationMessage("Email verified successfully! You can now sign in.");
    }
    else if (verificationStatus === "conflictgoogle") {
      setVerificationMessage("You have already signed up that email with Google.");
    }
    else if (verificationStatus === "conflictemail") {
      setVerificationMessage("You have already signed up that email using email and password.");
    }
  }, [verificationStatus]);

  const handleSignIn = async () => {
    setInvalidEmail(false);
    setEmptyEmail(false);
    setInvalidPassword(false);
    setEmptyPassword(false);
    setIncorrectEmailOrPassword(false);
    
    if(email === "") {
      setEmptyEmail(true);
      if(password === ""){
        setEmptyPassword(true);
      }
      return;
    }
    else if(password === ""){
      setEmptyPassword(true);
      return;
    }
    else if(!email.includes("@") || !email.includes(".")){
      setInvalidEmail(true);
      return;
    }
    else if(password.length < 8){
      setInvalidPassword(true);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', 
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { response: { status: response.status, data } };
      }
      
      console.log('Login successful:', data);
      
      router.push('/dashboard/document-list');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response) {
        if (error.response.status === 401 && error.response.data.message === 'Email not verified') {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
      }
      
      setIncorrectEmailOrPassword(true);
    }
  };

  return <div className="flex h-screen w-full bg-[url('@/public/images/backgroundauth.png')] fixed bg-cover bg-center">
    {/* left div */}
    <div className="opacity-100 text-black absolute left-20 top-1/2 transform -translate-y-1/2 w-[300px]  rounded-xl top-1/2">
      <div className=" w-full h-full rounded-xl">
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
        <h1 className="text-2xl font-bold text-[45px]">Sign In </h1>
        <img src="/images/dsvlogo.png" alt="Logo" className="h-10 w-10" />
      </div>
      
      {/* Google Sign In Button */}
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

      {/* Email Input */}
      <div className="relative w-full">
        <label htmlFor="email" className="text-sm">Email</label>
        <input 
          type="email" 
          name="email" 
          id="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-2 rounded-xl border-2 ${
            invalidEmail || emptyEmail ? "border-red-500" : "border-gray-300"
          }`} 
        />
        {emptyEmail && <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
        { invalidEmail && (
          <p className="text-red-500 text-xs mt-1">Invalid email address</p>
        )}
      </div>
      <br/>

      {/* Password Input */}  
      <div className="relative w-full">
        <label htmlFor="password" className="text-sm">Password</label>
        <div className="relative w-full">
          <input 
            type={showPassword ? "text" : "password"} 
            name="password" 
            id="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-2 rounded-xl border-2 ${
              invalidPassword || emptyPassword ? "border-red-500" : "border-gray-300"
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
        {emptyPassword&& <p className="text-red-500 text-xs mt-1">Mandatory field</p>}
        {invalidPassword && <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters</p>}
      </div>
      
      {/* Authentication error message */}
      <div className="w-full">
        { incorrectEmailOrPassword &&  (
          <p className="text-red-500 text-xs mt-1">Incorrect email or password</p>
        )}
      </div>
      {verificationMessage !== "" && (
        <p className="text-red-500 text-xs mt-1">{verificationMessage}</p>
      )}
      <br/>

      <button className="bg-blue-500 w-full text-white p-2 rounded-xl hover:bg-blue-600 cursor-pointer active:scale-95 transition-all duration-300" onClick={handleSignIn}>Sign In</button>
      <div className="flex items-center w-full justify-center h-10 relative top-5">
        <p className="text-gray-400">Do not have an account? <Link href="/auth/signup" className="text-black hover:text-blue-600 cursor-pointer">Sign Up</Link></p>
      </div>
    </div>
  </div>;
}
