/**
 * StatusBadge Component
 * 
 * Displays color-coded approval status badges with accessibility support.
 * 
 * Requirements:
 * - 8.8: Color-coded status badges (yellow=PENDING, green=APPROVED, red=REJECTED)
 * - 19.6: ARIA labels for accessibility
 */

import React from 'react';
import type { ApprovalStatus } from '../../types/admin.types';

interface StatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

/**
 * Status badge configuration with colors and labels
 */
const STATUS_CONFIG: Record<ApprovalStatus, {
  bgColor: string;
  textColor: string;
  label: string;
  ariaLabel: string;
}> = {
  PENDING: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    label: 'Pending',
    ariaLabel: 'Approval status: Pending review',
  },
  APPROVED: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    label: 'Approved',
    ariaLabel: 'Approval status: Approved',
  },
  REJECTED: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    label: 'Rejected',
    ariaLabel: 'Approval status: Rejected',
  },
};

/**
 * StatusBadge Component
 * 
 * Renders a color-coded badge indicating user approval status.
 * Includes proper ARIA labels for screen reader accessibility.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
      aria-label={config.ariaLabel}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
