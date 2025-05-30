import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { FileItem, SortOrder } from '@/types/document';

interface UseDocumentListProps {
  isAuthenticated: boolean;
}

export const useDocumentList = ({ isAuthenticated }: UseDocumentListProps) => {
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // Use refs to track loading state and prevent multiple simultaneous requests
  const isLoadingRef = useRef<boolean>(false);
  const currentPageRef = useRef<number>(0);

  // Fetch total files count
  const fetchTotalFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/file/total-files', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTotalFiles(data.total);
      }
    } catch (error) {
      console.error('Error fetching total files:', error);
    }
  }, []);

  // Fetch files list
  const fetchFiles = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (!isAuthenticated || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      console.log(`Fetching files for page ${pageNum}, sort: ${sortOrder}, reset: ${reset}`);
      
      const response = await fetch(`/api/file/list?page=${pageNum}&sort=${sortOrder}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.files.length} files for page ${pageNum}`);
        
        if (reset || pageNum === 0) {
          setFiles(data.files);
        } else {
          setFiles(prev => {
            // Prevent duplicate files by checking if any of the new files already exist
            const existingIds = new Set(prev.map(f => f.id));
            const newFiles = data.files.filter((file: FileItem) => !existingIds.has(file.id));
            return [...prev, ...newFiles];
          });
        }
        
        // Update hasMore based on the number of files received
        setHasMore(data.files.length === 10);
        currentPageRef.current = pageNum;
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [isAuthenticated, sortOrder]);

  // Handle sort toggle
  const toggleSort = useCallback(() => {
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setPage(0);
    currentPageRef.current = 0;
    setHasMore(true);
  }, []);

  // Handle load more files - use useCallback with stable dependencies
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current || !isAuthenticated) {
      console.log('Load more cancelled:', { hasMore, loading: isLoadingRef.current, isAuthenticated });
      return;
    }
    
    const nextPage = currentPageRef.current + 1;
    console.log(`Loading more files - next page: ${nextPage}`);
    setPage(nextPage);
  }, [hasMore, isAuthenticated]);

  // Refresh files (useful after upload)
  const refreshFiles = useCallback(() => {
    setPage(0);
    currentPageRef.current = 0;
    setHasMore(true);
    fetchTotalFiles();
    fetchFiles(0, true);
  }, [fetchTotalFiles, fetchFiles]);

  // Format date for display
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Effects
  useEffect(() => {
    if (isAuthenticated) {
      fetchTotalFiles();
    }
  }, [isAuthenticated, fetchTotalFiles]);

  // Fetch files when page or sort order changes
  useEffect(() => {
    if (isAuthenticated) {
      const isReset = page === 0;
      fetchFiles(page, isReset);
    }
  }, [isAuthenticated, page, fetchFiles]);

  // Reset when sort order changes
  useEffect(() => {
    if (isAuthenticated && page === 0) {
      fetchFiles(0, true);
    }
  }, [sortOrder]);

  return {
    files,
    totalFiles,
    loading,
    sortOrder,
    hasMore,
    toggleSort,
    loadMore,
    refreshFiles,
    formatDate
  };
}; 