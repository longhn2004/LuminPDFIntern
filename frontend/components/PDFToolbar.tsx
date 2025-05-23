import { FaArrowLeft, FaTrash, FaDownload, FaUsers } from "react-icons/fa";

interface PDFToolbarProps {
  fileName: string;
  isOwner: boolean;
  onNavigateBack: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShare: () => void;
}

export default function PDFToolbar({
  fileName,
  isOwner,
  onNavigateBack,
  onDelete,
  onDownload,
  onShare
}: PDFToolbarProps) {
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
        
        <button 
          onClick={onDownload} 
          className="h-10 px-4 flex items-center gap-2 bg-gray-300 border-2 border-gray-400 rounded-md hover:bg-gray-400 transition-colors duration-300 active:scale-95"
          title="Download document"
        >
          Download
          <FaDownload size={16} />
        </button>
        
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