import { useState, useCallback, useRef, useEffect } from "react";
import { FaArrowLeft, FaDownload, FaChevronDown } from "react-icons/fa";
import { useAppTranslations } from "@/hooks/useTranslations";

interface SharedPDFToolbarProps {
  fileName: string;
  isOwner: boolean; // Always false for shared access, but kept for interface compatibility
  userRole?: string;
  onNavigateBack: () => void;
  onDelete: () => void; // No-op for shared access
  onDownload: () => void;
  onDownloadWithAnnotations?: () => void;
  onShare: () => void; // No-op for shared access
  className?: string;
}

// Button style configurations - updated for black-grey-white theme
const BUTTON_STYLES = {
  base: "h-10 px-4 flex items-center gap-2 rounded-md transition-colors duration-300 active:scale-95 focus:outline-none",
  default: "bg-gray-100 border-2 border-gray-300 hover:bg-gray-200 text-gray-800",
  download: "focus:ring-2 focus:ring-gray-500", 
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
  return userRole === 'editor';
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
 * SharedPDFToolbar provides navigation and download actions for shared PDF documents
 * Simplified version without owner-only features like delete and share
 */
const SharedPDFToolbar: React.FC<SharedPDFToolbarProps> = ({
  fileName,
  userRole,
  onNavigateBack,
  onDownload,
  onDownloadWithAnnotations,
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
    <header className={`flex items-center justify-between p-4 border-b border-gray-300 bg-gray-50 ${className}`}>
      
      {/* Left Section - Navigation and Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button 
          onClick={onNavigateBack} 
          className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 flex-shrink-0"
          title={translations.viewer("backToLogin")}
          aria-label={translations.viewer("backToLogin")}
        >
          <FaArrowLeft size={16} />
        </button>
        
        <h1 
          className="font-medium text-gray-900 truncate"
          title={displayFileName || translations.viewer("sharedDocument")}
        >
          {displayFileName || translations.viewer("sharedDocument")}
        </h1>

        {/* Shared access indicator - updated to black-grey-white theme */}
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full border border-gray-300">
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          <span className="text-xs font-medium text-gray-700">
            {translations.viewer("sharedAccess")} {userRole === 'viewer' ? translations.share("ViewerRole") : translations.share("EditorRole")}
          </span>
        </div>
      </div>
      
      {/* Right Section - Download Actions Only */}
      <div className="flex items-center gap-2 flex-shrink-0">
        
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
          
          {/* Download Dropdown Menu - updated to black-grey-white theme */}
          {hasAnnotationDownload && (
            <div 
              className={`absolute right-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg transition-all duration-200 z-10 ${
                isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}
              role="menu"
              aria-orientation="vertical"
              onMouseEnter={cancelClose}
              onMouseLeave={closeDropdown}
            >
              <button
                onClick={(e) => handleDownloadOptionClick(e, onDownload)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-md flex items-center gap-2 focus:outline-none focus:bg-gray-100"
                role="menuitem"
              >
                <FaDownload size={14} />
                <span>{translations.viewer("downloadOriginalPDF")}</span>
              </button>
              
              <button
                onClick={(e) => handleDownloadOptionClick(e, onDownloadWithAnnotations!)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-md flex items-center gap-2 focus:outline-none focus:bg-gray-100"
                role="menuitem"
              >
                <FaDownload size={14} />
                <span>{translations.viewer("downloadWithAnnotations")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SharedPDFToolbar; 