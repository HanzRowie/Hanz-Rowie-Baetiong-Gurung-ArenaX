/**
 * UserDetailModal Component
 * 
 * Modal dialog for viewing detailed user information and performing approval actions.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import React, { useEffect } from 'react';
import type { AdminUser } from '../../types/admin.types';
import { DocumentViewer } from './DocumentViewer';

interface UserDetailModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  isLoading?: boolean;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  // Handle Escape key to close modal (Requirement 9.8)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

  if (!isOpen || !user) {
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isApproved = user.approval_status === 'APPROVED';
  const isRejected = user.approval_status === 'REJECTED';

  return (
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
        <div className="relative bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900" id="modal-title">
                  User Details
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Complete profile and verification information
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
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-180px)] px-4 sm:px-6 py-3 sm:py-4">
            {/* Basic Information */}
            <section className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{user.full_name}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900 break-all">{user.email}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">{user.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Role</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">{user.role}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">
                    {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">{user.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Country</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">{user.country || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Registration Date</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(user.created_at)}</p>
                </div>
              </div>
              {user.bio && (
                <div className="mt-3 sm:mt-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500">Bio</label>
                  <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{user.bio}</p>
                </div>
              )}
            </section>

            {/* Business Information (if applicable) */}
            {(user.business_name || user.business_registration) && (
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Business Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {user.business_name && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Business Name</label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{user.business_name}</p>
                    </div>
                  )}
                  {user.business_registration && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">Business Registration</label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{user.business_registration}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Approval Status */}
            <section className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Approval Status</h4>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Current Status</label>
                    <span
                      className={`mt-1 inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        user.approval_status
                      )}`}
                    >
                      {user.approval_status}
                    </span>
                  </div>
                  {user.approval_date && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">
                        {isApproved ? 'Approved On' : 'Rejected On'}
                      </label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900">{formatDate(user.approval_date)}</p>
                    </div>
                  )}
                  {user.approved_by_name && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-500">
                        {isApproved ? 'Approved By' : 'Rejected By'}
                      </label>
                      <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{user.approved_by_name}</p>
                    </div>
                  )}
                </div>
                
                {/* Rejection Reason (Requirement 9.7: Highlight rejection reason) */}
                {isRejected && user.rejection_reason && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
                    <label className="block text-xs sm:text-sm font-medium text-red-800 mb-1">Rejection Reason</label>
                    <p className="text-xs sm:text-sm text-red-700 break-words">{user.rejection_reason}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Documents Section (Requirement 9.3) */}
            <section className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Documents</h4>
              
              {/* Venue Owner Documents */}
              {user.role === 'VENUE_OWNER' && (
                <div className="space-y-4">
                  {/* Venue Images */}
                  {user.venue_images_urls && user.venue_images_urls.length > 0 && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Venue Images ({user.venue_images_urls.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {user.venue_images_urls.map((imageUrl, index) => (
                          <a
                            key={index}
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative group"
                          >
                            <img
                              src={imageUrl}
                              alt={`Venue ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:border-blue-500 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                                View Full Size
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Business Document */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Business Document
                    </label>
                    <DocumentViewer
                      documentUrl={user.business_document_url}
                      documentName="Business Registration/License"
                    />
                  </div>
                </div>
              )}
              
              {/* Organizer/Referee Certification */}
              {(user.role === 'ORGANIZER' || user.role === 'REFEREE') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Certification Document
                  </label>
                  <DocumentViewer
                    documentUrl={user.certification_document_url}
                    documentName={`${user.role === 'ORGANIZER' ? 'Organizer' : 'Referee'} Certification`}
                  />
                </div>
              )}
              
              {/* Player - No documents required */}
              {user.role === 'PLAYER' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-blue-700">
                    No documents required for player accounts.
                  </p>
                </div>
              )}
              
              {/* Legacy verification document (if exists) */}
              {user.verification_document_url && (
                <div className="mt-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Legacy Verification Document
                  </label>
                  <DocumentViewer
                    documentUrl={user.verification_document_url}
                    documentName="User Verification Document"
                  />
                </div>
              )}
            </section>

            {/* Recent Audit Logs */}
            {user.recent_audit_logs && user.recent_audit_logs.length > 0 && (
              <section className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3">Recent Activity</h4>
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
                        {user.recent_audit_logs.map((log) => (
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

          {/* Footer with action buttons (Requirement 9.5) - Sticky on mobile */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 sticky bottom-0">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Close
            </button>
            
            {/* Reject button - always enabled for PENDING users */}
            {user.approval_status === 'PENDING' && (
              <button
                onClick={() => onReject(user.id)}
                className="w-full sm:w-auto px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Reject'}
              </button>
            )}
            
            {/* Approve button - disabled if already approved (Requirement 9.6) */}
            <button
              onClick={() => onApprove(user.id)}
              disabled={isApproved || isLoading}
              className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                isApproved
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              aria-label={isApproved ? 'User already approved' : 'Approve user'}
            >
              {isLoading ? 'Processing...' : isApproved ? 'Already Approved' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
