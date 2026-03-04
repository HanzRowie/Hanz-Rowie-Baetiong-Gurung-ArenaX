/**
 * DocumentViewer Component
 * 
 * Displays verification documents with support for images and PDFs.
 * Requirements: 16.5, 16.6
 */

import React, { useState } from 'react';

interface DocumentViewerProps {
  documentUrl?: string;
  documentName?: string;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentName = 'Verification Document',
  className = '',
}) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  // Handle missing document
  if (!documentUrl) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No verification document uploaded</p>
      </div>
    );
  }

  // Determine document type from URL
  const fileExtension = documentUrl.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
  const isPdf = fileExtension === 'pdf';

  // Handle image zoom
  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setImageZoom(1);

  // Render image viewer with zoom
  if (isImage && !imageError) {
    return (
      <div className={`bg-gray-50 rounded-lg overflow-hidden ${className}`}>
        {/* Zoom controls */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{documentName}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              disabled={imageZoom <= 0.5}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom out"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {Math.round(imageZoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={imageZoom >= 3}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom in"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Reset zoom"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <a
              href={documentUrl}
              download
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Download document"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>

        {/* Image viewer with scroll */}
        <div className="overflow-auto max-h-[500px] p-4">
          <img
            src={documentUrl}
            alt={documentName}
            className="mx-auto transition-transform duration-200"
            style={{ transform: `scale(${imageZoom})` }}
            onError={() => setImageError(true)}
          />
        </div>
      </div>
    );
  }

  // Render PDF viewer/download
  if (isPdf) {
    return (
      <div className={`bg-gray-50 rounded-lg overflow-hidden ${className}`}>
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{documentName}</span>
          <a
            href={documentUrl}
            download
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
        </div>

        {/* PDF inline viewer (using iframe) */}
        <div className="p-4">
          <iframe
            src={documentUrl}
            className="w-full h-[500px] border border-gray-300 rounded"
            title={documentName}
          />
        </div>
      </div>
    );
  }

  // Fallback for unknown file types or image errors
  return (
    <div className={`bg-gray-50 border border-gray-300 rounded-lg p-8 text-center ${className}`}>
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <p className="mt-2 text-sm text-gray-700 font-medium">{documentName}</p>
      <a
        href={documentUrl}
        download
        className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Document
      </a>
    </div>
  );
};
