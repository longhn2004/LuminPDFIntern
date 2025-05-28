import React from "react";

interface AuthErrorMessageProps {
  message?: string;
}

export default function AuthErrorMessage({ message }: AuthErrorMessageProps) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
} 