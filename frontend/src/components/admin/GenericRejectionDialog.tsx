/**
 * GenericRejectionDialog - Reusable rejection dialog
 * Works for users, tournaments, and venues
 */

import React, { useState, useEffect } from 'react';

interface GenericRejectionDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  title: string;
  message: string;
  itemName: string;
  itemEmail?: string;
}

export const GenericRejectionDialog: React.FC<GenericRejectionDialogProps> = ({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
  title,
  message,
  itemName,
  itemEmail,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRejectionReason('');
      setError('');
    }
  }, [isOpen]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRejectionReason(value);
    
    if (value.length < 10) {
      setError('Rejection reason must be at least 10 characters');
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    if (rejectionReason.length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }
    onConfirm(rejectionReason);
  };

  const isConfirmDisabled = rejectionReason.length < 10 || isLoading;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900 bg-opacity-40 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejection-dialog-title"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto transform transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="rejection-dialog-title"
          className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4"
        >
          {title}
        </h2>

        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
            {message}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 mb-3 sm:mb-4">
            <div>
              <span className="text-xs sm:text-sm font-medium text-gray-600">Name:</span>
              <p className="text-sm sm:text-base text-gray-900 break-words">{itemName}</p>
            </div>
            {itemEmail && (
              <div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Email:</span>
                <p className="text-sm sm:text-base text-gray-900 break-all">{itemEmail}</p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="rejection-reason"
              className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={handleReasonChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 text-sm sm:text-base border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                error
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter the reason for rejection (minimum 10 characters)"
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'rejection-reason-error' : undefined}
            />
            <div className="mt-1 flex justify-between items-start">
              {error && (
                <p
                  id="rejection-reason-error"
                  className="text-xs sm:text-sm text-red-600"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <p
                className={`text-xs sm:text-sm ml-auto ${
                  rejectionReason.length < 10 ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {rejectionReason.length}/10 characters
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel rejection"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Confirm rejection"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Rejecting...
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
