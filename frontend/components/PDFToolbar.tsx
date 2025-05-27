import { FaArrowLeft, FaTrash, FaDownload, FaUsers, FaChevronDown } from "react-icons/fa";

interface PDFToolbarProps {
  fileName: string;
  isOwner: boolean;
  userRole?: string;
  onNavigateBack: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDownloadWithAnnotations?: () => void;
  onShare: () => void;
}

export default function PDFToolbar({
  fileName,
  isOwner,
  userRole,
  onNavigateBack,
  onDelete,
  onDownload,
  onDownloadWithAnnotations,
  onShare
}: PDFToolbarProps) {
  const canDownloadWithAnnotations = userRole === 'owner' || userRole === 'editor';

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <button 
          onClick={onNavigateBack} 
          className="text-gray-600 hover:text-gray-800"
          title="Back to document list"
        >
          <FaArrowLeft size={16} />
        </button>
        <h2 className="font-medium">{fileName}</h2>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Action buttons */}
        {isOwner && (
          <button 
            onClick={onDelete} 
            className="h-10 px-4 flex items-center gap-2 bg-gray-300 border-2 border-gray-400 rounded-md hover:bg-gray-400 transition-colors duration-300 active:scale-95"
            title="Delete document"
          >
            Delete
            <FaTrash size={16} />
          </button>
        )}
        
        {/* Download dropdown */}
        <div className="relative group">
          <button 
            onClick={canDownloadWithAnnotations && onDownloadWithAnnotations ? undefined : onDownload}
            className={`h-10 px-4 flex items-center gap-2 bg-gray-300 border-2 border-gray-400 rounded-md hover:bg-gray-400 transition-colors duration-300 active:scale-95 ${
              canDownloadWithAnnotations && onDownloadWithAnnotations ? 'cursor-default' : 'cursor-pointer'
            }`}
            title={canDownloadWithAnnotations ? "Download options" : "Download document"}
          >
            Download
            <FaDownload size={16} />
            {canDownloadWithAnnotations && onDownloadWithAnnotations && (
              <FaChevronDown size={12} className="ml-1" />
            )}
          </button>
          
          {/* Download dropdown menu - only show if user can download with annotations */}
          {canDownloadWithAnnotations && onDownloadWithAnnotations && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-md flex items-center gap-2"
              >
                <FaDownload size={14} />
                Download Original PDF
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadWithAnnotations();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-md flex items-center gap-2"
              >
                <FaDownload size={14} />
                Download with Annotations
              </button>
            </div>
          )}
        </div>
        
        {isOwner && (
          <button 
            onClick={onShare} 
            className="h-10 px-4 flex items-center gap-2 bg-gray-300 border-2 border-gray-400 rounded-md hover:bg-gray-400 transition-colors duration-300 active:scale-95"
            title="Share document"
          >
            Share
            <FaUsers size={16} />
          </button>
        )}
      </div>
    </div>
  );
} 