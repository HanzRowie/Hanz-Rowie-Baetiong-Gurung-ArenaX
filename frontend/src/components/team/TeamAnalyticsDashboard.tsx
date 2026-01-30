import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  BarChart,
  PieChart,
  KPIDashboard,
  ChartContainer
} from '@/components/charts';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { TeamService } from '@/services/teamService';
import type {
  Team,
  ActivityStatistics,
  ActivitySummary,
  ActivityHistory,
  ActivityEventType,
  SportType
} from '@/types/team.types';

interface TeamAnalyticsDashboardProps {
  team: Team;
  className?: string;
}

interface AnalyticsFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  sport?: SportType;
  eventTypes?: ActivityEventType[];
}

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  TEAM_CREATED: 'Team Created',
  MEMBER_ADDED: 'Member Added',
  MEMBER_REMOVED: 'Member Removed',
  ROLE_CHANGED: 'Role Changed',
  TOURNAMENT_REGISTERED: 'Tournament Registered',
  MATCH_PLAYED: 'Match Played',
  OWNERSHIP_TRANSFERRED: 'Ownership Transferred'
};

const DATE_RANGE_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
  all: 0
};

export const TeamAnalyticsDashboard: React.FC<TeamAnalyticsDashboardProps> = ({
  team,
  className = ''
}) => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: 'month'
  });

  // Fetch team analytics data
  const {
    data: statistics,
    isLoading: statisticsLoading,
    error: statisticsError
  } = useQuery({
    queryKey: ['team-statistics', team.id],
    queryFn: async () => {
      const response = await TeamService.getTeamActivityStatistics(team.id);
      return response.data as ActivityStatistics;
    }
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ['team-summary', team.id, filters.dateRange],
    queryFn: async () => {
      const days = DATE_RANGE_DAYS[filters.dateRange];
      const response = await TeamService.getTeamActivitySummary(
        team.id,
        days > 0 ? days : undefined
      );
      return response.data as ActivitySummary;
    }
  });

  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError
  } = useQuery({
    queryKey: ['team-recent-activity', team.id],
    queryFn: async () => {
      const response = await TeamService.getTeamActivityHistory(team.id, {
        limit: 10
      });
      return response.data as ActivityHistory[];
    }
  });

  const isLoading = statisticsLoading || summaryLoading || activityLoading;
  const hasError = statisticsError || summaryError || activityError;

  // Prepare chart data
  const prepareMonthlyTrendData = () => {
    if (!statistics?.monthly_activity_trend) return [];
    
    return Object.entries(statistics.monthly_activity_trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        label: new Date(month + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        value: count
      }));
  };

  const prepareEventTypeData = () => {
    if (!statistics?.event_type_breakdown) return [];
    
    return Object.entries(statistics.event_type_breakdown).map(([eventType, count]) => ({
      label: EVENT_TYPE_LABELS[eventType as ActivityEventType] || eventType,
      value: count
    }));
  };

  const prepareMostActiveUsersData = () => {
    if (!statistics?.most_active_users) return [];
    
    return statistics.most_active_users.map(user => ({
      label: user.name,
      value: user.activity_count
    }));
  };

  const getKPIData = () => {
    if (!statistics || !summary) return [];

    return [
      {
        id: 'total-activities',
        label: 'Total Activities',
        value: statistics.total_activities,
        trend: summary.total_activities > 0 ? {
          value: summary.total_activities,
          type: 'increase' as const
        } : undefined,
        unit: 'activities'
      },
      {
        id: 'active-members',
        label: 'Active Members',
        value: team.member_count,
        target: team.max_size,
        unit: 'members'
      },
      {
        id: 'team-age',
        label: 'Team Age',
        value: Math.floor(
          (new Date().getTime() - new Date(team.created_at).getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
        unit: 'days'
      }
    ];
  };

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Failed to load analytics</h3>
          <p className="text-sm text-gray-600">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Analytics</h2>
          <p className="text-gray-600">{team.name} - Performance Overview</p>
        </div>
        
        {/* Filters */}
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange({ dateRange: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          
          {team.sport_types.length > 1 && (
            <select
              value={filters.sport || ''}
              onChange={(e) => handleFilterChange({ 
                sport: e.target.value ? e.target.value as SportType : undefined 
              })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sports</option>
              {team.sport_types.map(sport => (
                <option key={sport} value={sport}>
                  {sport.charAt(0) + sport.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <KPIDashboard kpis={getKPIData()} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Trend */}
        <ChartContainer
          title="Activity Trend"
          subtitle="Team activity over time"
        >
          <LineChart
            series={[{
              id: 'activity-trend',
              name: 'Activities',
              data: prepareMonthlyTrendData().map(item => ({
                x: item.label,
                y: item.value
              })),
              color: '#3B82F6'
            }]}
            height={300}
            showGrid
            showTooltip
          />
        </ChartContainer>

        {/* Event Type Breakdown */}
        <ChartContainer
          title="Activity Types"
          subtitle="Breakdown by event type"
        >
          <PieChart
            data={prepareEventTypeData()}
            height={300}
            showLegend
            showTooltip
          />
        </ChartContainer>

        {/* Most Active Users */}
        <ChartContainer
          title="Most Active Members"
          subtitle="Activity by team members"
        >
          <BarChart
            data={prepareMostActiveUsersData()}
            height={300}
            showGrid
            showTooltip
          />
        </ChartContainer>

        {/* Recent Activity Timeline */}
        <ChartContainer
          title="Recent Activity"
          subtitle="Latest team activities"
        >
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity?.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {EVENT_TYPE_LABELS[activity.event_type] || activity.event_type}
                  </p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span>
                      {new Date(activity.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {activity.performed_by && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{activity.performed_by.full_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>

      {/* Team Summary Stats */}
      {statistics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Team Information</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Created:</dt>
                  <dd className="text-gray-900">
                    {new Date(team.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Sports:</dt>
                  <dd className="text-gray-900">
                    {team.sport_types.join(', ')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Members:</dt>
                  <dd className="text-gray-900">
                    {team.member_count} / {team.max_size}
                  </dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Activity Overview</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total Activities:</dt>
                  <dd className="text-gray-900">{statistics.total_activities}</dd>
                </div>
                {statistics.first_activity && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">First Activity:</dt>
                    <dd className="text-gray-900">
                      {new Date(statistics.first_activity.timestamp).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {statistics.last_activity && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Last Activity:</dt>
                    <dd className="text-gray-900">
                      {new Date(statistics.last_activity.timestamp).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contributors</h4>
              <div className="space-y-2">
                {statistics.most_active_users.slice(0, 3).map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">
                      {index + 1}. {user.name}
                    </span>
                    <span className="text-gray-600">{user.activity_count}</span>
                  </div>
                ))}
                {statistics.most_active_users.length === 0 && (
                  <p className="text-sm text-gray-500">No activity data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAnalyticsDashboard;