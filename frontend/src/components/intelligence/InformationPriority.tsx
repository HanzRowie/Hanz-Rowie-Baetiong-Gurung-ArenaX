/**
 * Information Priority Component
 * Visual hierarchy system for prioritizing and highlighting important information
 */

import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Star, 
  TrendingUp, 
  Zap,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/design-system/utils/cn';

export interface PriorityItem {
  id: string;
  content: React.ReactNode;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category?: string;
  timestamp?: Date;
  urgent?: boolean;
  actionable?: boolean;
  metadata?: {
    source?: string;
    confidence?: number;
    expiresAt?: Date;
  };
}

interface InformationPriorityProps {
  items: PriorityItem[];
  className?: string;
  layout?: 'list' | 'grid' | 'timeline';
  showTimestamps?: boolean;
  showCategories?: boolean;
  maxItems?: number;
  onItemClick?: (item: PriorityItem) => void;
}

export function InformationPriority({
  items,
  className,
  layout = 'list',
  showTimestamps = true,
  showCategories = false,
  maxItems,
  onItemClick,
}: InformationPriorityProps) {
  // Sort items by priority and urgency
  const sortedItems = useMemo(() => {
    const priorityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    
    return items
      .sort((a, b) => {
        // Urgent items first
        if (a.urgent !== b.urgent) {
          return a.urgent ? -1 : 1;
        }
        
        // Then by priority
        if (a.priority !== b.priority) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        
        // Then by timestamp (newest first)
        if (a.timestamp && b.timestamp) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
        
        return 0;
      })
      .slice(0, maxItems);
  }, [items, maxItems]);

  const getPriorityIcon = (priority: PriorityItem['priority'], urgent?: boolean) => {
    const iconClass = "h-4 w-4";
    
    if (urgent) {
      return <Zap className={cn(iconClass, "text-red-500")} />;
    }
    
    switch (priority) {
      case 'critical':
        return <XCircle className={cn(iconClass, "text-red-500")} />;
      case 'high':
        return <AlertTriangle className={cn(iconClass, "text-orange-500")} />;
      case 'medium':
        return <Star className={cn(iconClass, "text-yellow-500")} />;
      case 'low':
        return <TrendingUp className={cn(iconClass, "text-blue-500")} />;
      case 'info':
        return <Info className={cn(iconClass, "text-gray-500")} />;
    }
  };

  const getPriorityStyles = (priority: PriorityItem['priority'], urgent?: boolean) => {
    if (urgent) {
      return {
        container: 'border-l-red-500 bg-red-50 border-red-200',
        badge: 'bg-red-100 text-red-800',
      };
    }
    
    switch (priority) {
      case 'critical':
        return {
          container: 'border-l-red-500 bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-800',
        };
      case 'high':
        return {
          container: 'border-l-orange-500 bg-orange-50 border-orange-200',
          badge: 'bg-orange-100 text-orange-800',
        };
      case 'medium':
        return {
          container: 'border-l-yellow-500 bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      case 'low':
        return {
          container: 'border-l-blue-500 bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
        };
      case 'info':
        return {
          container: 'border-l-gray-500 bg-gray-50 border-gray-200',
          badge: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  if (sortedItems.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          All Clear!
        </h3>
        <p className="text-gray-600">
          No priority items require your attention at the moment.
        </p>
      </div>
    );
  }

  const layoutClasses = {
    list: 'space-y-3',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    timeline: 'space-y-4 relative',
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {sortedItems.map((item, index) => {
        const styles = getPriorityStyles(item.priority, item.urgent);
        
        return (
          <div
            key={item.id}
            className={cn(
              'border-l-4 border rounded-lg p-4 transition-all duration-200',
              styles.container,
              onItemClick && 'cursor-pointer hover:shadow-md',
              item.urgent && 'animate-pulse'
            )}
            onClick={() => onItemClick?.(item)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-1">
                  {getPriorityIcon(item.priority, item.urgent)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      styles.badge
                    )}>
                      {item.urgent ? 'URGENT' : item.priority.toUpperCase()}
                    </span>
                    
                    {item.actionable && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ACTION REQUIRED
                      </span>
                    )}
                    
                    {showCategories && item.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {item.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-900 mb-2">
                    {item.content}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {showTimestamps && item.timestamp && (
                      <span>{formatTimestamp(item.timestamp)}</span>
                    )}
                    
                    {item.metadata?.source && (
                      <span>Source: {item.metadata.source}</span>
                    )}
                    
                    {item.metadata?.confidence && (
                      <span>
                        Confidence: {Math.round(item.metadata.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}