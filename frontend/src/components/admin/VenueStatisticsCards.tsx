/**
 * Venue Statistics Cards Component
 * 
 * Displays aggregated venue statistics for the admin dashboard.
 * Shows total venues, pending approvals, approved, and rejected venues.
 */

import React, { useEffect } from 'react';
import { MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { VenueStats } from '@/types/verification.types';

interface VenueStatisticsCardsProps {
  stats: VenueStats | undefined;
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

export const VenueStatisticsCards: React.FC<VenueStatisticsCardsProps> = ({ 
  stats, 
  isLoading 
}) => {
  // Log the stats to debug
  useEffect(() => {
    console.log('[VenueStatisticsCards] Received stats:', stats);
  }, [stats]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Total Venues"
        value={stats?.total}
        icon={<MapPin className="w-12 h-12" />}
        colorClass="text-green-600"
        bgColorClass="bg-green-50"
        isLoading={isLoading}
      />
      <StatCard
        title="Pending Approvals"
        value={stats?.pending}
        icon={<Clock className="w-12 h-12" />}
        colorClass="text-yellow-600"
        bgColorClass="bg-yellow-50"
        isLoading={isLoading}
      />
      <StatCard
        title="Approved Venues"
        value={stats?.approved}
        icon={<CheckCircle className="w-12 h-12" />}
        colorClass="text-green-600"
        bgColorClass="bg-green-50"
        isLoading={isLoading}
      />
      <StatCard
        title="Rejected Venues"
        value={stats?.rejected}
        icon={<XCircle className="w-12 h-12" />}
        colorClass="text-red-600"
        bgColorClass="bg-red-50"
        isLoading={isLoading}
      />
    </div>
  );
};
