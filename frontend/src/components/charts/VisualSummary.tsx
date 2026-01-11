/**
 * Visual Summary Components
 * Components for displaying key metrics and summaries
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';
import { LinearProgress, CircularProgress } from './ProgressIndicator';

// Metric Card
export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
  size = 'md',
  className,
}: MetricCardProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const valueSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const colorClasses = {
    primary: 'border-l-primary-500 bg-primary-50',
    success: 'border-l-green-500 bg-green-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    error: 'border-l-red-500 bg-red-50',
    neutral: 'border-l-gray-500 bg-gray-50',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    
    switch (trend.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border-l-4 shadow-sm transition-all duration-200 hover:shadow-md',
      sizeClasses[size],
      colorClasses[color],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600 truncate">
              {title}
            </h3>
          </div>
          
          <div className={cn(
            'font-bold text-gray-900 mb-1',
            valueSizeClasses[size]
          )}>
            {value}
          </div>
          
          {subtitle && (
            <p className="text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {getTrendIcon()}
          <span className={cn('text-sm font-medium', getTrendColor())}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          {trend.period && (
            <span className="text-xs text-gray-500">
              {trend.period}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// KPI Dashboard
export interface KPIItem {
  id: string;
  label: string;
  value: number;
  target?: number;
  unit?: string;
  trend?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  color?: string;
}

export interface KPIDashboardProps {
  kpis: KPIItem[];
  className?: string;
  layout?: 'grid' | 'list';
}

export function KPIDashboard({
  kpis,
  className,
  layout = 'grid',
}: KPIDashboardProps) {
  return (
    <div className={cn(
      layout === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        : 'space-y-4',
      className
    )}>
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {kpi.label}
            </h4>
            {kpi.trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                kpi.trend.type === 'increase' && 'text-green-600',
                kpi.trend.type === 'decrease' && 'text-red-600',
                kpi.trend.type === 'neutral' && 'text-gray-600'
              )}>
                {kpi.trend.type === 'increase' && <ArrowUp className="h-3 w-3" />}
                {kpi.trend.type === 'decrease' && <ArrowDown className="h-3 w-3" />}
                {kpi.trend.value > 0 ? '+' : ''}{kpi.trend.value}%
              </div>
            )}
          </div>
          
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">
              {kpi.value.toLocaleString()}
            </span>
            {kpi.unit && (
              <span className="text-sm text-gray-500 mb-1">
                {kpi.unit}
              </span>
            )}
          </div>
          
          {kpi.target && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress to target</span>
                <span>{((kpi.value / kpi.target) * 100).toFixed(1)}%</span>
              </div>
              <LinearProgress
                value={kpi.value}
                max={kpi.target}
                size="sm"
                color={kpi.value >= kpi.target ? 'success' : 'primary'}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Comparison Chart
export interface ComparisonItem {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}

export interface ComparisonChartProps {
  items: ComparisonItem[];
  title?: string;
  className?: string;
}

export function ComparisonChart({
  items,
  title,
  className,
}: ComparisonChartProps) {
  const maxValue = Math.max(
    ...items.flatMap(item => [item.current, item.previous])
  );

  return (
    <div className={cn('bg-white rounded-lg p-6 border border-gray-200', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h3>
      )}
      
      <div className="space-y-4">
        {items.map((item, index) => {
          const change = item.current - item.previous;
          const changePercent = item.previous > 0 
            ? ((change / item.previous) * 100) 
            : 0;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-900 font-medium">
                    {item.current.toLocaleString()}{item.unit}
                  </span>
                  <span className={cn(
                    'text-xs font-medium',
                    change > 0 && 'text-green-600',
                    change < 0 && 'text-red-600',
                    change === 0 && 'text-gray-600'
                  )}>
                    ({change > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 h-6">
                {/* Previous value bar */}
                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full transition-all duration-300"
                    style={{ width: `${(item.previous / maxValue) * 100}%` }}
                  />
                </div>
                
                {/* Current value bar */}
                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      change > 0 && 'bg-green-500',
                      change < 0 && 'bg-red-500',
                      change === 0 && 'bg-blue-500'
                    )}
                    style={{ width: `${(item.current / maxValue) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>Previous: {item.previous.toLocaleString()}{item.unit}</span>
                <span>Current: {item.current.toLocaleString()}{item.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded-full" />
          <span>Previous</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
}