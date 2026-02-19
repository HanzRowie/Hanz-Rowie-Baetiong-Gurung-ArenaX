/**
 * Payment Status Badge Component
 * Displays payment status with appropriate styling
 */

import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, Ban } from 'lucide-react';
import type { PaymentStatus } from '../types/payment.types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md' | 'lg';
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          label: 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'PENDING':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'PROCESSING':
        return {
          icon: RefreshCw,
          label: 'Processing',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'FAILED':
        return {
          icon: XCircle,
          label: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'CANCELLED':
        return {
          icon: Ban,
          label: 'Cancelled',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      case 'REFUNDED':
        return {
          icon: AlertCircle,
          label: 'Refunded',
          className: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      default:
        return {
          icon: AlertCircle,
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizeClasses[size]}`}
    >
      <Icon size={iconSizes[size]} />
      {config.label}
    </span>
  );
};

export default PaymentStatusBadge;
