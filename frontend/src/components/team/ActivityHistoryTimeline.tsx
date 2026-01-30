import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { TeamService } from '@/services/teamService';
import type {
  ActivityHistory,
  ActivityEventType
} from '@/types/team.types';

interface ActivityHistoryTimelineProps {
  teamId: string;
  className?: string;
  limit?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  groupByDate?: boolean;
}

interface TimelineFilters {
  eventTypes: ActivityEventType[];
  dateFrom?: string;
  dateTo?: string;
  performedBy?: string;
  searchTerm?: string;
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

const EVENT_TYPE_COLORS: Record<ActivityEventType, string> = {
  TEAM_CREATED: 'bg-green-500',
  MEMBER_ADDED: 'bg-blue-500',
  MEMBER_REMOVED: 'bg-red-500',
  ROLE_CHANGED: 'bg-yellow-500',
  TOURNAMENT_REGISTERED: 'bg-purple-500',
  MATCH_PLAYED: 'bg-indigo-500',
  OWNERSHIP_TRANSFERRED: 'bg-orange-500'
};

const EVENT_TYPE_ICONS: Record<ActivityEventType, string> = {
  TEAM_CREATED: '🎉',
  MEMBER_ADDED: '👤',
  MEMBER_REMOVED: '👋',
  ROLE_CHANGED: '🔄',
  TOURNAMENT_REGISTERED: '🏆',
  MATCH_PLAYED: '⚽',
  OWNERSHIP_TRANSFERRED: '👑'
};

export const ActivityHistoryTimeline: React.FC<ActivityHistoryTimelineProps> = ({
  teamId,
  className = '',
  limit = 50,
  showSearch = true,
  showFilters = true,
  groupByDate = true
}) => {
  const [filters, setFilters] = useState<TimelineFilters>({
    eventTypes: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch activity history
  const {
    data: activities,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'team-activity-history',
      teamId,
      filters.eventTypes,
      filters.dateFrom,
      filters.dateTo,
      filters.performedBy,
      debouncedSearch,
      limit
    ],
    queryFn: async () => {
      if (debouncedSearch.trim()) {
        // Use search endpoint
        const response = await TeamService.searchTeamActivity(
          teamId,
          debouncedSearch.trim(),
          limit
        );
        return response.data as ActivityHistory[];
      } else {
        // Use regular activity history endpoint
        const response = await TeamService.getTeamActivityHistory(teamId, {
          limit,
          event_types: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          performed_by_id: filters.performedBy
        });
        return response.data as ActivityHistory[];
      }
    }
  });

  // Fetch timeline data if grouping by date (disabled for now)
  // const {
  //   data: timelineData,
  //   isLoading: timelineLoading
  // } = useQuery({
  //   queryKey: ['team-activity-timeline', teamId, groupByDate],
  //   queryFn: async () => {
  //     const response = await TeamService.getTeamActivityTimeline(teamId, groupByDate);
  //     return response.data;
  //   },
  //   enabled: groupByDate && false // Disabled for now as we're using the regular activities
  // });

  // Process activities for display
  const processedActivities = useMemo(() => {
    if (!activities) return [];

    let filteredActivities = activities;

    // Apply client-side filters if needed
    if (filters.eventTypes.length > 0) {
      filteredActivities = filteredActivities.filter(activity =>
        filters.eventTypes.includes(activity.event_type)
      );
    }

    if (filters.performedBy) {
      filteredActivities = filteredActivities.filter(activity =>
        activity.performed_by?.id === filters.performedBy
      );
    }

    return filteredActivities;
  }, [activities, filters]);

  // Group activities by date if enabled
  const groupedActivities = useMemo(() => {
    if (!groupByDate || !processedActivities) return null;

    const grouped: Record<string, ActivityHistory[]> = {};
    
    processedActivities.forEach(activity => {
      const date = new Date(activity.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(activity);
    });

    return grouped;
  }, [processedActivities, groupByDate]);

  const handleEventTypeToggle = (eventType: ActivityEventType) => {
    setFilters(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter(type => type !== eventType)
        : [...prev.eventTypes, eventType]
    }));
  };

  const clearFilters = () => {
    setFilters({ eventTypes: [] });
    setSearchQuery('');
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderActivityItem = (activity: ActivityHistory, isLast: boolean = false) => (
    <div key={activity.id} className="relative flex items-start space-x-3 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200"></div>
      )}
      
      {/* Event icon */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm
        ${EVENT_TYPE_COLORS[activity.event_type]}
      `}>
        {EVENT_TYPE_ICONS[activity.event_type]}
      </div>
      
      {/* Event content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {EVENT_TYPE_LABELS[activity.event_type] || activity.event_type}
          </p>
          <time className="text-xs text-gray-500">
            {formatRelativeTime(activity.timestamp)}
          </time>
        </div>
        
        <p className="text-sm text-gray-600 mt-1">
          {activity.description}
        </p>
        
        {activity.performed_by && (
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
            <span>{activity.performed_by.full_name}</span>
          </div>
        )}
        
        {/* Metadata display */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              View details
            </summary>
            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <LoadingSkeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton className="h-4 w-3/4" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Failed to load activity history</h3>
          <p className="text-sm text-gray-600">Please try again later</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activity History</h3>
        
        {/* Search and filters toggle */}
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-2 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
          
          {(filters.eventTypes.length > 0 || searchQuery) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Event type filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPE_LABELS).map(([eventType, label]) => (
            <button
              key={eventType}
              onClick={() => handleEventTypeToggle(eventType as ActivityEventType)}
              className={`
                px-3 py-1 text-xs rounded-full border transition-colors
                ${filters.eventTypes.includes(eventType as ActivityEventType)
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {EVENT_TYPE_ICONS[eventType as ActivityEventType]} {label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline content */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          {groupByDate && groupedActivities ? (
            // Grouped by date view
            <div className="space-y-8">
              {Object.entries(groupedActivities)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, dayActivities]) => (
                  <div key={date}>
                    <h4 className="text-sm font-medium text-gray-900 mb-4 sticky top-0 bg-white py-2">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h4>
                    <div className="space-y-0">
                      {dayActivities.map((activity, index) =>
                        renderActivityItem(activity, index === dayActivities.length - 1)
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Linear timeline view
            <div className="space-y-0">
              {processedActivities.map((activity, index) =>
                renderActivityItem(activity, index === processedActivities.length - 1)
              )}
            </div>
          )}

          {/* Empty state */}
          {(!processedActivities || processedActivities.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
              <p className="text-gray-600">
                {searchQuery || filters.eventTypes.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Team activity will appear here as it happens'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Load more button */}
      {processedActivities && processedActivities.length >= limit && (
        <div className="text-center">
          <button
            onClick={() => {
              // This would typically load more activities
              // For now, just show a message
              alert('Load more functionality would be implemented here');
            }}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            Load more activities
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityHistoryTimeline;