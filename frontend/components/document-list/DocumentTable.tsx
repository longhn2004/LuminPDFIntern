"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import DocumentTableRow from './DocumentTableRow';
import LoadingSkeletonRow from './LoadingSkeletonRow';
import { FileItem, SortOrder } from '@/types/document';

interface DocumentTableProps {
  files: FileItem[];
  loading: boolean;
  hasMore: boolean;
  sortOrder: SortOrder;
  currentUserName: string;
  onSortToggle: () => void;
  onFileClick: (fileId: string) => void;
  onLoadMore: () => void;
  formatDate: (dateString: string) => string;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
  files,
  loading,
  hasMore,
  sortOrder,
  currentUserName,
  onSortToggle,
  onFileClick,
  onLoadMore,
  formatDate
}) => {
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Stable callback for intersection observer
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loading) {
      console.log('Intersection detected, loading more files...');
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Infinite scroll observer
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 1.0,
      rootMargin: '20px'
    });

    // Observe the loader element
    if (loaderRef.current && hasMore) {
      observerRef.current.observe(loaderRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, hasMore]);

  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Fixed Table header */}
      <div className="bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                File Name
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 w-48">
                Document Owner
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 w-44">
                <div className="flex items-center">
                  <span>Last Updated</span>
                  <button 
                    onClick={onSortToggle}
                    className="ml-2 focus:outline-none hover:text-gray-900"
                  >
                    {sortOrder === 'ASC' ? <FaSortUp /> : <FaSortDown />}
                  </button>
                </div>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable Table body */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full border-collapse">
          <tbody>
            {loading && files.length === 0 ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <LoadingSkeletonRow key={`skeleton-${index}`} />
              ))
            ) : (
              files.map(file => (
                <DocumentTableRow
                  key={file.id}
                  file={file}
                  currentUserName={currentUserName}
                  onClick={onFileClick}
                  formatDate={formatDate}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Loader for infinite scroll */}
        {hasMore && files.length > 0 && (
          <div ref={loaderRef} className="text-center py-4">
            {loading && <p className="text-gray-500">Loading more files...</p>}
            {!loading && <p className="text-gray-400">Scroll to load more...</p>}
          </div>
        )}
        
        {/* End of list indicator */}
        {!hasMore && files.length > 0 && (
          <div className="text-center py-4">
            <p className="text-gray-400">No more files to load</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentTable;