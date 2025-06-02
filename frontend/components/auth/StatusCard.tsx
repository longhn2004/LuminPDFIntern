import React from "react";

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  message: React.ReactNode;
  buttons?: React.ReactNode;
  width?: string;
  titleSize?: string;
}

export default function StatusCard({ 
  icon, 
  title, 
  message, 
  buttons, 
  width = "w-1/2",
  titleSize = "text-2xl"
}: StatusCardProps) {
  return (
    <div className={`mx-4 bg-white rounded-lg p-8 text-center ${width}`}>
      {/* Icon */}
      <div className="flex justify-center mb-6">
        {icon}
      </div>
      
      {/* Title */}
      <h1 className={`${titleSize} font-bold text-gray-800 mb-4`}>{title}</h1>
      
      {/* Message */}
      <div className="text-gray-600 mb-6">{message}</div>
      
      {/* Buttons or additional content */}
      {buttons && (
        <div className="mt-8 flex justify-center">
          {buttons}
        </div>
      )}
    </div>
  );
} 