/**
 * Statistics Cards Component
 * 
 * Displays aggregated user statistics for the admin dashboard.
 * Shows total users, pending approvals, approved today, and rejected users.
 * 
 * Requirements:
 * - 8.3: Display four statistics cards with color-coded indicators
 * - 6.3: Display statistics from API endpoint
 */

import React from 'react';
import type { UserStats } from '../../types/admin.types';

interface StatisticsCardsProps {
  stats: UserStats | undefined;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  colorClass: string;
  bgColorClass: string;
  isLoading?: boolean;
}

/**
 * Individual statistic card component
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  colorClass,
  bgColorClass,
  isLoading
}) => {
  return (
    <div className={`${bgColorClass} rounded-lg shadow-md p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {isLoading ? (
            <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className={`text-3xl font-bold ${colorClass}`}>
              {value === undefined ? '0' : value.toLocaleString()}
            </p>
          )}
        </div>
        <div className={`${colorClass} opacity-80`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

/**
 * Total Users Card
 * Displays the total count of all registered users
 */
const TotalUsersCard: React.FC<{ count: number | undefined; isLoading?: boolean }> = ({ 
  count, 
  isLoading 
}) => {
  return (
    <StatCard
      title="Total Users"
      value={count}
      icon={
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
      }
      colorClass="text-blue-600"
      bgColorClass="bg-blue-50"
      isLoading={isLoading}
    />
  );
};

/**
 * Pending Approvals Card
 * Displays the count of users awaiting approval (yellow indicator)
 */
const PendingApprovalsCard: React.FC<{ count: number | undefined; isLoading?: boolean }> = ({ 
  count, 
  isLoading 
}) => {
  return (
    <StatCard
      title="Pending Approvals"
      value={count}
      icon={
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      }
      colorClass="text-yellow-600"
      bgColorClass="bg-yellow-50"
      isLoading={isLoading}
    />
  );
};

/**
 * Approved Today Card
 * Displays the count of users approved in the last 24 hours (green indicator)
 */
const ApprovedTodayCard: React.FC<{ count: number | undefined; isLoading?: boolean }> = ({ 
  count, 
  isLoading 
}) => {
  return (
    <StatCard
      title="Approved Today"
      value={count}
      icon={
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      }
      colorClass="text-green-600"
      bgColorClass="bg-green-50"
      isLoading={isLoading}
    />
  );
};

/**
 * Rejected Users Card
 * Displays the total count of rejected users (red indicator)
 */
const RejectedUsersCard: React.FC<{ count: number | undefined; isLoading?: boolean }> = ({ 
  count, 
  isLoading 
}) => {
  return (
    <StatCard
      title="Rejected Users"
      value={count}
      icon={
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      }
      colorClass="text-red-600"
      bgColorClass="bg-red-50"
      isLoading={isLoading}
    />
  );
};

/**
 * Main Statistics Cards Container
 * Displays all four statistic cards in a responsive grid
 */
export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ stats, isLoading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <TotalUsersCard count={stats?.total_users} isLoading={isLoading} />
      <PendingApprovalsCard count={stats?.pending_approvals} isLoading={isLoading} />
      <ApprovedTodayCard count={stats?.approved_today} isLoading={isLoading} />
      <RejectedUsersCard count={stats?.rejected_total} isLoading={isLoading} />
    </div>
  );
};

// Export individual cards for potential standalone use
export {
  TotalUsersCard,
  PendingApprovalsCard,
  ApprovedTodayCard,
  RejectedUsersCard
};
