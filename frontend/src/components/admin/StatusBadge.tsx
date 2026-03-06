/**
 * StatusBadge Component
 * 
 * Displays color-coded approval status badges with accessibility support.
 * 
 * Requirements:
 * - 8.8: Color-coded status badges (yellow=PENDING, green=APPROVED, red=REJECTED, orange=CONDITIONAL_APPROVAL)
 * - 19.6: ARIA labels for accessibility
 */

import React from 'react';
import type { ApprovalStatus as AdminApprovalStatus } from '../../types/admin.types';
import type { ApprovalStatus as VerificationApprovalStatus } from '../../types/verification.types';

// Union type to support both admin and verification approval statuses
type ApprovalStatus = AdminApprovalStatus | VerificationApprovalStatus;

interface StatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

/**
 * Status badge configuration with colors, icons, and labels
 */
const STATUS_CONFIG: Record<ApprovalStatus, {
  bgColor: string;
  textColor: string;
  label: string;
  ariaLabel: string;
  icon: React.ReactNode;
}> = {
  PENDING: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    label: 'Pending',
    ariaLabel: 'Approval status: Pending review',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  APPROVED: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    label: 'Approved',
    ariaLabel: 'Approval status: Approved',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  REJECTED: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    label: 'Rejected',
    ariaLabel: 'Approval status: Rejected',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  CONDITIONAL_APPROVAL: {
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    label: 'Conditional',
    ariaLabel: 'Approval status: Conditional approval pending documents',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

/**
 * StatusBadge Component
 * 
 * Renders a color-coded badge with icon indicating user approval status.
 * Includes proper ARIA labels for screen reader accessibility.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
      aria-label={config.ariaLabel}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
