import React from "react";

export default function AuthDivider() {
  return (
    <div className="flex items-center w-full my-4">
      <hr className="flex-grow border-gray-300" />
      <span className="px-3 text-gray-500 text-sm">or</span>
      <hr className="flex-grow border-gray-300" />
    </div>
  );
} 