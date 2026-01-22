/**
 * Timeline Widget
 * Displays chronological events and activities
 */

import React from 'react';
import { Calendar, Trophy, Award, Activity, Clock } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';
import type { BaseWidget, TimelineData } from '@/types/dashboard.types';

interface TimelineWidgetProps {
  widget: BaseWidget;
}

export function TimelineWidget({ widget }: TimelineWidgetProps) {
  // Mock data - in real implementation, this would come from widget.data
  const timelineData: TimelineData[] = widget.data || [
    {
      id: '1',
      title: 'Won Championship Final',
      description: 'Defeated Sarah Wilson 6-4, 6-2',
      date: '2024-12-20T14:30:00Z',
      type: 'achievement',
      icon: 'trophy',
      color: 'yellow'
    },
    {
      id: '2',
      title: 'Registered for Spring Tournament',
      description: 'City Tennis Championship 2024',
      date: '2024-12-18T10:15:00Z',
      type: 'event',
      icon: 'calendar',
      color: 'blue'
    },
    {
      id: '3',
      title: 'Reached Milestone',
      description: '100 matches played',
      date: '2024-12-15T16:45:00Z',
      type: 'milestone',
      icon: 'award',
      color: 'purple'
    },
    {
      id: '4',
      title: 'Training Session',
      description: 'Completed advanced technique training',
      date: '2024-12-12T09:00:00Z',
      type: 'activity',
      icon: 'activity',
      color: 'green'
    }
  ];

  const getIcon = (iconName: string, color: string) => {
    const iconClass = `h-4 w-4 text-${color}-600`;
    
    switch (iconName) {
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'award':
        return <Award className={iconClass} />;
      case 'activity':
        return <Activity className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      yellow: 'bg-yellow-100 border-yellow-200',
      blue: 'bg-blue-100 border-blue-200',
      purple: 'bg-purple-100 border-purple-200',
      green: 'bg-green-100 border-green-200',
      red: 'bg-red-100 border-red-200',
    };
    
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    try {
      // Use proper date parsing with timezone handling
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      
      if (diffInHours < 0) {
        // Future date
        const futureDiffInHours = Math.abs(diffInHours);
        if (futureDiffInHours < 24) {
          return `in ${futureDiffInHours}h`;
        } else if (futureDiffInHours < 168) { // 7 days
          return `in ${Math.floor(futureDiffInHours / 24)}d`;
        } else {
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
          });
        }
      } else if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInHours < 168) { // 7 days
        return `${Math.floor(diffInHours / 24)}d ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Recent Activity
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          {/* Timeline items */}
          <div className="space-y-4">
            {timelineData.map((item, index) => (
              <div key={item.id} className="relative flex items-start gap-3">
                {/* Timeline dot */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2',
                  getColorClasses(item.color)
                )}>
                  {getIcon(item.icon, item.color)}
                </div>
                
                {/* Timeline content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  
                  {/* Type badge */}
                  <div className="mt-2">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      item.type === 'achievement' && 'bg-yellow-100 text-yellow-800',
                      item.type === 'event' && 'bg-blue-100 text-blue-800',
                      item.type === 'milestone' && 'bg-purple-100 text-purple-800',
                      item.type === 'activity' && 'bg-green-100 text-green-800'
                    )}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
}