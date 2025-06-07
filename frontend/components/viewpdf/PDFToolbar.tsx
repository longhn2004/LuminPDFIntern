import { useState, useCallback, useRef, useEffect } from "react";
import { FaArrowLeft, FaTrash, FaDownload, FaUsers, FaChevronDown } from "react-icons/fa";
import { useAppTranslations } from "@/hooks/useTranslations";

interface PDFToolbarProps {
  fileName: string;
  isOwner: boolean;
  userRole?: string;
  onNavigateBack: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDownloadWithAnnotations?: () => void;
  onShare: () => void;
  className?: string;
}

// Button style configurations
const BUTTON_STYLES = {
  base: "h-10 px-4 flex items-center gap-2 rounded-md transition-colors duration-300 active:scale-95 focus:outline-none",
  default: "bg-gray-300 border-2 border-gray-400 hover:bg-gray-400",
  delete: "focus:ring-2 focus:ring-red-500",
  download: "focus:ring-2 focus:ring-blue-500", 
  share: "focus:ring-2 focus:ring-green-500"
} as const;

/**
 * Clean filename by removing .pdf extension
 */
const formatFileName = (fileName: string): string => {
  return fileName.replace(/\.pdf$/i, '');
};

/**
 * Determine if user can download with annotations
 */
const canUserDownloadWithAnnotations = (userRole?: string): boolean => {
  return userRole === 'owner' || userRole === 'editor';
};

/**
 * Custom hook for dropdown functionality
 */
const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const openDropdown = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small delay to allow for mouse movement
  }, []);

  const cancelClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    openDropdown,
    closeDropdown,
    cancelClose
  };
};

/**
 * PDFToolbar provides navigation and action buttons for PDF documents
 */
const PDFToolbar: React.FC<PDFToolbarProps> = ({
  fileName,
  isOwner,
  userRole,
  onNavigateBack,
  onDelete,
  onDownload,
  onDownloadWithAnnotations,
  onShare,
  className = ""
}) => {
  const translations = useAppTranslations();
  const { isOpen: isDropdownOpen, openDropdown, closeDropdown, cancelClose } = useDropdown();
  
  const canDownloadWithAnnotations = canUserDownloadWithAnnotations(userRole);
  const hasAnnotationDownload = canDownloadWithAnnotations && onDownloadWithAnnotations;
  const displayFileName = formatFileName(fileName);

  const handleDownloadClick = useCallback(() => {
    if (!hasAnnotationDownload) {
      onDownload();
    }
  }, [hasAnnotationDownload, onDownload]);

  const handleDownloadOptionClick = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  }, [closeDropdown]);

  return (
    <header className={`flex items-center justify-between p-4 border-b border-gray-200 bg-white ${className}`}>
      
      {/* Left Section - Navigation and Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button 
          onClick={onNavigateBack} 
          className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
          title={translations.viewer("backToDocumentList")}
          aria-label={translations.viewer("backToDocumentList")}
        >
          <FaArrowLeft size={16} />
        </button>
        
        <h1 
          className="font-medium text-gray-900 truncate"
          title={displayFileName || translations.viewer("untitledDocument")}
        >
          {displayFileName || translations.viewer("untitledDocument")}
        </h1>
      </div>
      
      {/* Right Section - Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        
        {/* Delete Button - Owner Only */}
        {isOwner && (
          <button 
            onClick={onDelete} 
            className={`${BUTTON_STYLES.base} ${BUTTON_STYLES.default} ${BUTTON_STYLES.delete} cursor-pointer`}
            title={translations.viewer("deleteDocument")}
            aria-label={translations.viewer("deleteDocument")}
          >
            <span className="hidden sm:inline">{translations.common("delete")}</span>
            <FaTrash size={16} />
          </button>
        )}
        
        {/* Download Button/Dropdown */}
        <div 
          className="relative"
          onMouseEnter={hasAnnotationDownload ? openDropdown : undefined}
          onMouseLeave={hasAnnotationDownload ? closeDropdown : undefined}
        >
          <button 
            onClick={hasAnnotationDownload ? undefined : handleDownloadClick}
            onKeyDown={handleKeyDown}
            className={`${BUTTON_STYLES.base} ${BUTTON_STYLES.default} ${BUTTON_STYLES.download} ${
              hasAnnotationDownload ? 'cursor-default' : 'cursor-pointer'
            }`}
            title={hasAnnotationDownload ? translations.viewer("downloadOptions") : translations.viewer("downloadDocument")}
            aria-label={hasAnnotationDownload ? translations.viewer("downloadOptions") : translations.viewer("downloadDocument")}
            aria-haspopup={hasAnnotationDownload ? "true" : undefined}
            aria-expanded={hasAnnotationDownload ? isDropdownOpen : undefined}
          >
            <span className="hidden sm:inline">{translations.common("download")}</span>
            <FaDownload size={16} />
            {hasAnnotationDownload && (
              <FaChevronDown 
                size={12} 
                className={`ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            )}
          </button>
          
          {/* Download Dropdown Menu */}
          {hasAnnotationDownload && (
            <div 
              className={`absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg transition-all duration-200 z-10 ${
                isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}
              role="menu"
              aria-orientation="vertical"
              onMouseEnter={cancelClose}
              onMouseLeave={closeDropdown}
            >
              <button
                onClick={(e) => handleDownloadOptionClick(e, onDownload)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-md flex items-center gap-2 focus:outline-none focus:bg-gray-100 cursor-pointer"
                role="menuitem"
              >
                <FaDownload size={14} />
                <span>{translations.viewer("downloadOriginalPDF")}</span>
              </button>
              
              <button
                onClick={(e) => handleDownloadOptionClick(e, onDownloadWithAnnotations!)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-md flex items-center gap-2 focus:outline-none focus:bg-gray-100 cursor-pointer"
                role="menuitem"
              >
                <FaDownload size={14} />
                <span>{translations.viewer("downloadWithAnnotations")}</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Share Button - Owner Only */}
        {isOwner && (
          <button 
            onClick={onShare} 
            className={`${BUTTON_STYLES.base} ${BUTTON_STYLES.default} ${BUTTON_STYLES.share} cursor-pointer`}
            title={translations.viewer("shareDocument")}
            aria-label={translations.viewer("shareDocument")}
          >
            <span className="hidden sm:inline">{translations.common("share")}</span>
            <FaUsers size={16} />
          </button>
        )}
      </div>
    </header>
  );
};

export default PDFToolbar; 