import React from 'react';
import type { AdminUser } from '../../types/admin.types';

interface ApprovalConfirmationDialogProps {
  user: AdminUser;
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApprovalConfirmationDialog: React.FC<ApprovalConfirmationDialogProps> = ({
  user,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-dialog-title"
    >
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-4 sm:p-6">
        <h2
          id="approval-dialog-title"
          className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4"
        >
          Approve User Registration
        </h2>

        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
            Are you sure you want to approve this user?
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
            <div>
              <span className="text-xs sm:text-sm font-medium text-gray-600">Name:</span>
              <p className="text-sm sm:text-base text-gray-900 break-words">{user.full_name}</p>
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-gray-600">Email:</span>
              <p className="text-sm sm:text-base text-gray-900 break-all">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel approval"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Confirm approval"
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
                Approving...
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
