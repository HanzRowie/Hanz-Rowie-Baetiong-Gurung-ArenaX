/**
 * Recent Activity Widget
 * Displays recent user activities and system events
 */

import React from 'react';
import { Activity, User, Calendar, Trophy, MessageCircle, Bell } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';
import type { BaseWidget } from '@/types/dashboard.types';

interface ActivityItem {
  id: string;
  type: 'user' | 'system' | 'tournament' | 'message' | 'notification';
  title: string;
  description?: string;
  timestamp: string;
  icon: string;
  color: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface RecentActivityWidgetProps {
  widget: BaseWidget;
}

export function RecentActivityWidget({ widget }: RecentActivityWidgetProps) {
  // Mock data - in real implementation, this would come from widget.data
  const activities: ActivityItem[] = widget.data || [
    {
      id: '1',
      type: 'tournament',
      title: 'New tournament registration',
      description: 'City Championship 2024',
      timestamp: '2024-12-22T10:30:00Z',
      icon: 'trophy',
      color: 'yellow',
      user: {
        name: 'Alex Johnson',
        avatar: '/images/Card Profile.png'
      }
    },
    {
      id: '2',
      type: 'message',
      title: 'New message received',
      description: 'From Sarah Wilson about match schedule',
      timestamp: '2024-12-22T09:15:00Z',
      icon: 'message',
      color: 'blue',
      user: {
        name: 'Sarah Wilson',
        avatar: '/images/Card Profile-1.png'
      }
    },
    {
      id: '3',
      type: 'system',
      title: 'Profile updated',
      description: 'Your player profile has been updated',
      timestamp: '2024-12-21T16:45:00Z',
      icon: 'user',
      color: 'green'
    },
    {
      id: '4',
      type: 'tournament',
      title: 'Match result submitted',
      description: 'Won against Mike Chen 6-4, 6-2',
      timestamp: '2024-12-21T14:20:00Z',
      icon: 'trophy',
      color: 'purple'
    },
    {
      id: '5',
      type: 'notification',
      title: 'Reminder: Upcoming match',
      description: 'Tomorrow at 2:00 PM vs Emma Davis',
      timestamp: '2024-12-21T12:00:00Z',
      icon: 'bell',
      color: 'orange'
    }
  ];

  const getIcon = (iconName: string, color: string) => {
    const iconClass = `h-4 w-4 text-${color}-600`;
    
    switch (iconName) {
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'message':
        return <MessageCircle className={iconClass} />;
      case 'user':
        return <User className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'bell':
        return <Bell className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      yellow: 'bg-yellow-100 border-yellow-200',
      blue: 'bg-blue-100 border-blue-200',
      green: 'bg-green-100 border-green-200',
      purple: 'bg-purple-100 border-purple-200',
      orange: 'bg-orange-100 border-orange-200',
      red: 'bg-red-100 border-red-200',
    };
    
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 border-gray-200';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Recent Activity
        </span>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Activity Icon */}
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border flex-shrink-0',
                getColorClasses(activity.color)
              )}>
                {getIcon(activity.icon, activity.color)}
              </div>
              
              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    {activity.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    {activity.user && (
                      <div className="flex items-center gap-2 mt-2">
                        {activity.user.avatar ? (
                          <img
                            src={activity.user.avatar}
                            alt={activity.user.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-2 w-2 text-gray-600" />
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {activity.user.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
}