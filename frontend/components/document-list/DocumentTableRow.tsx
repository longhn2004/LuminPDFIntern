"use client";

import React from 'react';
import Avatar from '@/components/Avatar';
import { FileItem } from '@/types/document';
import { useAppTranslations } from '@/hooks/useTranslations';

interface DocumentTableRowProps {
  file: FileItem;
  currentUserName: string;
  onClick: (fileId: string) => void;
  formatDate: (dateString: string) => string;
}

const DocumentTableRow: React.FC<DocumentTableRowProps> = ({
  file,
  currentUserName,
  onClick,
  formatDate
}) => {
  const translations = useAppTranslations();

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-200 transition-colors"
      onClick={() => onClick(file.id)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center">
          <span className="truncate">{file.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 w-48">
        <div className="flex items-center">
          <Avatar name={file.owner} size="sm" className="mr-3 flex-shrink-0" />
          <span className="truncate">
            {file.owner}
            {file.owner === currentUserName && (
              <span className="text-gray-500 font-normal ml-1">({translations.common("you")})</span>
            )}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-gray-500 w-44">
        <div className="flex flex-col">
          <span>{new Date(file.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="text-xs">{new Date(file.updatedAt).toLocaleTimeString()}</span>
        </div>
      </td>
    </tr>
  );
};

export default DocumentTableRow; 