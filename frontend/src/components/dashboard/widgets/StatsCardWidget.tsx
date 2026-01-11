/**
 * Stats Card Widget
 * Displays key metrics with optional trend indicators
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';
import type { BaseWidget, StatsCardData } from '@/types/dashboard.types';

interface StatsCardWidgetProps {
  widget: BaseWidget;
}

export function StatsCardWidget({ widget }: StatsCardWidgetProps) {
  // Mock data - in real implementation, this would come from widget.data
  const data: StatsCardData = widget.data || {
    value: '2,847',
    label: 'Total Matches',
    change: {
      value: 12.5,
      type: 'increase',
      period: 'vs last month'
    },
    icon: 'trophy',
    color: 'blue'
  };

  const getTrendIcon = () => {
    if (!data.change) return null;
    
    switch (data.change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!data.change) return 'text-gray-500';
    
    switch (data.change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Main Value */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {data.value}
        </div>
        <div className="text-sm text-gray-600">
          {data.label}
        </div>
      </div>

      {/* Trend Indicator */}
      {data.change && widget.config?.showTrend !== false && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {getTrendIcon()}
          <span className={cn('text-sm font-medium', getTrendColor())}>
            {data.change.value > 0 ? '+' : ''}{data.change.value}%
          </span>
          <span className="text-xs text-gray-500">
            {data.change.period}
          </span>
        </div>
      )}
    </div>
  );
}