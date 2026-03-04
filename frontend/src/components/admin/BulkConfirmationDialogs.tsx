import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface BulkApprovalDialogProps {
  isOpen: boolean;
  userCount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * BulkApprovalDialog Component
 * 
 * Confirmation dialog for bulk user approval.
 * Requirements: 15.5, 15.9
 */
export const BulkApprovalDialog: React.FC<BulkApprovalDialogProps> = ({
  isOpen,
  userCount,
  onConfirm,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-approval-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>

        {/* Title */}
        <h2
          id="bulk-approval-title"
          className="text-xl font-semibold text-gray-900 text-center mb-2"
        >
          Approve Selected Users
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to approve{' '}
          <span className="font-semibold text-gray-900">
            {userCount} {userCount === 1 ? 'user' : 'users'}
          </span>
          ? They will be granted access to the platform immediately.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <span>Confirm Approval</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BulkRejectionDialogProps {
  isOpen: boolean;
  userCount: number;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * BulkRejectionDialog Component
 * 
 * Confirmation dialog for bulk user rejection with reason input.
 * Requirements: 15.6, 15.9
 */
export const BulkRejectionDialog: React.FC<BulkRejectionDialogProps> = ({
  isOpen,
  userCount,
  onConfirm,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Validate rejection reason
    if (rejectionReason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await onConfirm(rejectionReason);
      setRejectionReason('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setRejectionReason('');
    setError('');
    onCancel();
  };

  const isReasonValid = rejectionReason.trim().length >= 10;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-rejection-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>

        {/* Title */}
        <h2
          id="bulk-rejection-title"
          className="text-xl font-semibold text-gray-900 text-center mb-2"
        >
          Reject Selected Users
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-4">
          You are about to reject{' '}
          <span className="font-semibold text-gray-900">
            {userCount} {userCount === 1 ? 'user' : 'users'}
          </span>
          . Please provide a reason that will be sent to all selected users.
        </p>

        {/* Rejection Reason Input */}
        <div className="mb-4">
          <label
            htmlFor="bulk-rejection-reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bulk-rejection-reason"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setError('');
            }}
            placeholder="Enter reason for rejection (minimum 10 characters)"
            rows={4}
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={error ? 'rejection-reason-error' : undefined}
            aria-invalid={!!error}
          />
          <div className="flex justify-between items-center mt-1">
            <span
              className={`text-xs ${
                rejectionReason.length < 10 ? 'text-gray-500' : 'text-green-600'
              }`}
            >
              {rejectionReason.length}/10 characters minimum
            </span>
          </div>
          {error && (
            <p id="rejection-reason-error" className="text-sm text-red-600 mt-1">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !isReasonValid}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <span>Confirm Rejection</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
  errors?: string[];
}

interface BulkOperationSummaryDialogProps {
  isOpen: boolean;
  operation: 'approve' | 'reject';
  result: BulkOperationResult;
  onClose: () => void;
}

/**
 * BulkOperationSummaryDialog Component
 * 
 * Displays summary of bulk operation results showing successful and failed operations.
 * Requirements: 15.9
 */
export const BulkOperationSummaryDialog: React.FC<BulkOperationSummaryDialogProps> = ({
  isOpen,
  operation,
  result,
  onClose,
}) => {
  if (!isOpen) return null;

  const isSuccess = result.failed === 0;
  const operationText = operation === 'approve' ? 'Approval' : 'Rejection';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-summary-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-4 ${
            isSuccess ? 'bg-green-100' : 'bg-yellow-100'
          }`}
        >
          {isSuccess ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          )}
        </div>

        {/* Title */}
        <h2
          id="bulk-summary-title"
          className="text-xl font-semibold text-gray-900 text-center mb-4"
        >
          Bulk {operationText} {isSuccess ? 'Complete' : 'Partially Complete'}
        </h2>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Requested:</span>
            <span className="text-sm font-semibold text-gray-900">{result.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Successful:</span>
            <span className="text-sm font-semibold text-green-600">{result.successful}</span>
          </div>
          {result.failed > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failed:</span>
              <span className="text-sm font-semibold text-red-600">{result.failed}</span>
            </div>
          )}
        </div>

        {/* Error Details */}
        {result.errors && result.errors.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-32 overflow-y-auto">
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {isSuccess ? (
            <>
              All {result.successful} {result.successful === 1 ? 'user has' : 'users have'} been{' '}
              {operation === 'approve' ? 'approved' : 'rejected'} successfully.
            </>
          ) : (
            <>
              {result.successful} {result.successful === 1 ? 'user was' : 'users were'}{' '}
              {operation === 'approve' ? 'approved' : 'rejected'} successfully, but {result.failed}{' '}
              {result.failed === 1 ? 'operation' : 'operations'} failed.
            </>
          )}
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default {
  BulkApprovalDialog,
  BulkRejectionDialog,
  BulkOperationSummaryDialog,
};
