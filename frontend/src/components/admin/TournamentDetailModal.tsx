/**
 * TournamentDetailModal Component
 * 
 * Modal dialog for viewing detailed tournament information and performing approval actions.
 * Requirements: 8.5, 8.6, 8.8, 10.1-10.6, 12.6, 14.2, 16.4, 17.2, 20.4, 20.6, 26.6
 */

import React, { useEffect, useState } from 'react';
import type { AdminTournament } from '../../types/verification.types';
import { DocumentViewer } from './DocumentViewer';

interface TournamentDetailModalProps {
  tournament: AdminTournament | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (tournamentId: string, notes?: string) => void;
  onReject: (tournamentId: string, reason: string) => void;
  onConditionalApprove: (tournamentId: string, requestedDocuments: string[]) => void;
  isLoading?: boolean;
}

export const TournamentDetailModal: React.FC<TournamentDetailModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onConditionalApprove,
  isLoading = false,
}) => {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState<string[]>([]);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  // Handle keyboard shortcuts (Requirement 16.4, 26.6)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen || !tournament) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // A = Approve
      if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        if (tournament.approval_status === 'PENDING') {
          setShowApprovalDialog(true);
        }
      }

      // R = Reject
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        if (tournament.approval_status === 'PENDING') {
          setShowRejectionDialog(true);
        }
      }

      // Escape = Close modal
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showApprovalDialog) {
          setShowApprovalDialog(false);
        } else if (showRejectionDialog) {
          setShowRejectionDialog(false);
        } else if (showConditionalDialog) {
          setShowConditionalDialog(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, tournament, showApprovalDialog, showRejectionDialog, showConditionalDialog, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !tournament) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CONDITIONAL_APPROVAL':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isApproved = tournament.approval_status === 'APPROVED';
  const isRejected = tournament.approval_status === 'REJECTED';
  const isPending = tournament.approval_status === 'PENDING';
  const isConditional = tournament.approval_status === 'CONDITIONAL_APPROVAL';

  const handleApprove = () => {
    onApprove(tournament.id, approvalNotes || undefined);
    setShowApprovalDialog(false);
    setApprovalNotes('');
  };

  const handleReject = () => {
    if (rejectionReason.trim().length < 10) {
      setRejectionError('Rejection reason must be at least 10 characters');
      return;
    }
    onReject(tournament.id, rejectionReason);
    setShowRejectionDialog(false);
    setRejectionReason('');
    setRejectionError('');
  };

  const handleConditionalApprove = () => {
    if (requestedDocs.length > 0) {
      onConditionalApprove(tournament.id, requestedDocs);
      setShowConditionalDialog(false);
      setRequestedDocs([]);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal container - Mobile responsive */}
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900" id="modal-title">
                    Tournament Details
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    Complete tournament information and verification
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                  aria-label="Close modal"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Keyboard shortcut hints (Requirement 16.4, 26.6) */}
              {isPending && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center">
                    <kbd className="px-2 py-0.5 bg-gray-200 rounded">A</kbd>
                    <span className="ml-1">Approve</span>
                  </span>
                  <span className="inline-flex items-center">
                    <kbd className="px-2 py-0.5 bg-gray-200 rounded">R</kbd>
                    <span className="ml-1">Reject</span>
                  </span>
                  <span className="inline-flex items-center">
                    <kbd className="px-2 py-0.5 bg-gray-200 rounded">Esc</kbd>
                    <span className="ml-1">Close</span>
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-180px)] px-4 sm:px-6 py-3 sm:py-4">
              {/* Basic Information (Requirement 8.5) */}
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Tournament Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Title</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{tournament.title}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Sport Type</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{tournament.sport_type}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Date</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(tournament.date)}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Venue</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{tournament.venue}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Max Teams</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{tournament.max_teams}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Registration Deadline</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(tournament.registration_deadline)}</p>
                  </div>
                  {tournament.prize_pool && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Prize Pool</label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900">NPR {tournament.prize_pool.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Submission Date</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(tournament.created_at)}</p>
                  </div>
                </div>
              </section>

              {/* Organizer Details (Requirement 8.5) */}
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Organizer Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{tournament.organizer_name}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-all">{tournament.organizer_email}</p>
                  </div>
                </div>
              </section>

              {/* Approval Status and History (Requirement 8.5, 17.2) */}
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Approval Status</h4>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Current Status</label>
                      <span
                        className={`mt-1 inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          tournament.approval_status
                        )}`}
                      >
                        {tournament.approval_status.replace('_', ' ')}
                      </span>
                    </div>
                    {tournament.approval_date && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">
                          {isApproved ? 'Approved On' : isRejected ? 'Rejected On' : 'Status Changed On'}
                        </label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(tournament.approval_date)}</p>
                      </div>
                    )}
                    {tournament.approved_by_name && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-500">
                          {isApproved ? 'Approved By' : isRejected ? 'Rejected By' : 'Processed By'}
                        </label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{tournament.approved_by_name}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Rejection Reason */}
                  {isRejected && tournament.rejection_reason && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
                      <label className="block text-xs sm:text-sm font-medium text-red-800 mb-1">Rejection Reason</label>
                      <p className="text-xs sm:text-sm text-red-700 break-words">{tournament.rejection_reason}</p>
                    </div>
                  )}

                  {/* Approval Notes */}
                  {tournament.approval_notes && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md">
                      <label className="block text-xs sm:text-sm font-medium text-green-800 mb-1">Approval Notes</label>
                      <p className="text-xs sm:text-sm text-green-700 break-words">{tournament.approval_notes}</p>
                    </div>
                  )}

                  {/* Requested Documents for Conditional Approval */}
                  {isConditional && tournament.requested_documents && tournament.requested_documents.length > 0 && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Requested Documents</label>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-blue-700">
                        {tournament.requested_documents.map((doc, index) => (
                          <li key={index}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* Validation Results (Requirement 12.6) */}
              {tournament.validation_results && tournament.validation_results.length > 0 && (
                <section className="mb-4 sm:mb-6">
                  <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Validation Results</h4>
                  <div className="space-y-2">
                    {tournament.validation_results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${
                          result.severity === 'error'
                            ? 'bg-red-50 border-red-200'
                            : result.severity === 'warning'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadgeClass(
                              result.severity
                            )}`}
                          >
                            {result.severity.toUpperCase()}
                          </span>
                          <div className="ml-3 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{result.field}</p>
                            <p className="mt-1 text-xs sm:text-sm text-gray-700">{result.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Verification Documents (Requirement 10.1-10.6, 20.4) */}
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Verification Documents</h4>
                {tournament.verification_documents && tournament.verification_documents.length > 0 ? (
                  <div className="space-y-4">
                    {tournament.verification_documents.map((doc, index) => (
                      <DocumentViewer
                        key={index}
                        documentUrl={doc.file_url}
                        documentName={`${doc.document_type} - ${doc.file_name || 'Document'}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No verification documents uploaded</p>
                  </div>
                )}
              </section>

              {/* Audit Log (Requirement 17.2) */}
              {tournament.audit_logs && tournament.audit_logs.length > 0 && (
                <section className="mb-4 sm:mb-6">
                  <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Activity History</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Administrator</th>
                            <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tournament.audit_logs.map((log) => (
                            <tr key={log.id}>
                              <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">{log.action_type}</td>
                              <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 break-words">{log.administrator_name}</td>
                              <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500">{formatDate(log.timestamp)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Footer with action buttons (Requirement 8.6, 8.8, 14.2, 20.6) */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 sticky bottom-0">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Close
              </button>
              
              {/* Request Documents button for conditional approval */}
              {isPending && (
                <button
                  onClick={() => setShowConditionalDialog(true)}
                  className="w-full sm:w-auto px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  Request Documents
                </button>
              )}
              
              {/* Reject button */}
              {isPending && (
                <button
                  onClick={() => setShowRejectionDialog(true)}
                  className="w-full sm:w-auto px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Reject'}
                </button>
              )}
              
              {/* Approve button */}
              <button
                onClick={() => setShowApprovalDialog(true)}
                disabled={isApproved || isLoading}
                className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isApproved
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                aria-label={isApproved ? 'Tournament already approved' : 'Approve tournament'}
              >
                {isLoading ? 'Processing...' : isApproved ? 'Already Approved' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Confirmation Dialog (Requirement 8.6, 20.6) */}
      {showApprovalDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowApprovalDialog(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Tournament</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to approve "{tournament.title}"?
              </p>
              
              <div className="mb-6">
                <label htmlFor="approval-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  id="approval-notes"
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Add any notes about this approval..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setApprovalNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Dialog (Requirement 8.6, 20.6) */}
      {showRejectionDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowRejectionDialog(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Tournament</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting "{tournament.title}".
              </p>
              
              <div className="mb-6">
                <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (e.target.value.trim().length >= 10) {
                      setRejectionError('');
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                    rejectionError
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                  placeholder="Enter the reason for rejection (minimum 10 characters)"
                />
                {rejectionError && (
                  <p className="mt-1 text-sm text-red-600">{rejectionError}</p>
                )}
                <p className={`mt-1 text-xs ${rejectionReason.trim().length < 10 ? 'text-red-600' : 'text-gray-500'}`}>
                  {rejectionReason.trim().length}/10 characters
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectionDialog(false);
                    setRejectionReason('');
                    setRejectionError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isLoading || rejectionReason.trim().length < 10}
                >
                  {isLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Approval Dialog (Requirement 14.2) */}
      {showConditionalDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowConditionalDialog(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Additional Documents</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select the documents you need from the organizer before final approval.
              </p>
              
              <div className="space-y-2 mb-6">
                {['Business License', 'Payment Verification', 'Insurance Certificate', 'Venue Agreement', 'Other Documentation'].map((doc) => (
                  <label key={doc} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={requestedDocs.includes(doc)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRequestedDocs([...requestedDocs, doc]);
                        } else {
                          setRequestedDocs(requestedDocs.filter(d => d !== doc));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{doc}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConditionalDialog(false);
                    setRequestedDocs([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConditionalApprove}
                  disabled={requestedDocs.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Request Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
