import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

/**
 * BulkActionsToolbar Component
 * 
 * Displays a toolbar when users are selected, providing bulk approval/rejection actions.
 * Requirements: 15.3, 15.4
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onClearSelection,
  isLoading = false,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border border-gray-200 px-6 py-4 flex items-center gap-4 z-50 animate-slide-up"
      role="toolbar"
      aria-label="Bulk actions toolbar"
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} {selectedCount === 1 ? 'user' : 'users'} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear selection"
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Approve Selected Button */}
        <button
          onClick={onApproveSelected}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label={`Approve ${selectedCount} selected ${selectedCount === 1 ? 'user' : 'users'}`}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Approve Selected</span>
        </button>

        {/* Reject Selected Button */}
        <button
          onClick={onRejectSelected}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label={`Reject ${selectedCount} selected ${selectedCount === 1 ? 'user' : 'users'}`}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Reject Selected</span>
        </button>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;
