/**
 * Progress Indicator Components
 * Various progress visualization components
 */

import React from 'react';
import { cn } from '@/design-system/utils/cn';

// Linear Progress Bar
export interface LinearProgressProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export function LinearProgress({
  value,
  max = 100,
  className,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  animated = false,
}: LinearProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-600">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorClasses[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Circular Progress
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  color = 'primary',
  showLabel = true,
  label,
  animated = false,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-primary-500',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-300 ease-out',
            colorClasses[color],
            animated && 'animate-pulse'
          )}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {percentage.toFixed(0)}%
          </span>
          {label && (
            <span className="text-xs text-gray-600 mt-1">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Step Progress
export interface StepProgressProps {
  steps: Array<{
    id: string;
    label: string;
    description?: string;
    completed?: boolean;
    current?: boolean;
    error?: boolean;
  }>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function StepProgress({
  steps,
  className,
  orientation = 'horizontal',
}: StepProgressProps) {
  return (
    <div className={cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
      className
    )}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'flex items-center',
            orientation === 'horizontal' ? 'flex-row' : 'flex-col',
            index < steps.length - 1 && orientation === 'horizontal' && 'flex-1'
          )}
        >
          {/* Step indicator */}
          <div className="flex items-center">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium',
              step.completed && 'bg-green-500 border-green-500 text-white',
              step.current && !step.completed && 'bg-primary-500 border-primary-500 text-white',
              step.error && 'bg-red-500 border-red-500 text-white',
              !step.completed && !step.current && !step.error && 'bg-white border-gray-300 text-gray-500'
            )}>
              {step.completed ? '✓' : step.error ? '✗' : index + 1}
            </div>
            
            {/* Step label */}
            <div className={cn(
              'ml-3',
              orientation === 'vertical' && 'mb-4'
            )}>
              <div className={cn(
                'text-sm font-medium',
                step.completed && 'text-green-700',
                step.current && 'text-primary-700',
                step.error && 'text-red-700',
                !step.completed && !step.current && !step.error && 'text-gray-500'
              )}>
                {step.label}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className={cn(
              orientation === 'horizontal' 
                ? 'flex-1 h-px bg-gray-300 mx-4'
                : 'w-px h-8 bg-gray-300 ml-4'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// Multi-Progress (stacked progress bars)
export interface MultiProgressProps {
  segments: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function MultiProgress({
  segments,
  max,
  className,
  size = 'md',
  showLabels = true,
}: MultiProgressProps) {
  const total = max || segments.reduce((sum, segment) => sum + segment.value, 0);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {segments.reduce((sum, s) => sum + s.value, 0)} / {total}
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden flex',
        sizeClasses[size]
      )}>
        {segments.map((segment) => {
          const percentage = (segment.value / total) * 100;
          return (
            <div
              key={segment.id}
              className="h-full transition-all duration-300 ease-out first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${percentage}%`,
                backgroundColor: segment.color,
              }}
              title={`${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      
      {showLabels && (
        <div className="flex flex-wrap gap-3 mt-2">
          {segments.map((segment) => (
            <div key={segment.id} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-gray-600">
                {segment.label} ({segment.value})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}