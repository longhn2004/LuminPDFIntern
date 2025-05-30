"use client";

import React from 'react';

const LoadingSkeletonRow: React.FC = () => {
  return (
    <tr className="border-b border-gray-200">
      <td className="py-3 px-4">
        <div className="flex items-center">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </td>
      <td className="py-3 px-4 w-48">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse mr-3 flex-shrink-0"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
        </div>
      </td>
      <td className="py-3 px-4 text-gray-500 w-44">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </td>
    </tr>
  );
};

export default LoadingSkeletonRow; 