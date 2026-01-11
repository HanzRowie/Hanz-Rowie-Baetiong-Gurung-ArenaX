/**
 * Dashboard Widget
 * Base widget component with resize handles and configuration
 */

import React, { useState, useCallback } from 'react';
import { Settings, X, Maximize2, Minimize2, MoreVertical } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/design-system/utils/cn';
import { useDashboard } from './DashboardProvider';
import type { BaseWidget } from '@/types/dashboard.types';

// Widget Content Components
import { StatsCardWidget } from './widgets/StatsCardWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { TimelineWidget } from './widgets/TimelineWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { IntelligenceWidget } from './widgets/IntelligenceWidget';

// Widget Props
interface DashboardWidgetProps {
  widget: BaseWidget;
  isEditing: boolean;
  onResize?: (widgetId: string, newSize: { w: number; h: number }) => void;
}

// Widget Size Mapping
const sizeClasses = {
  sm: 'min-h-[200px]',
  md: 'min-h-[300px]',
  lg: 'min-h-[400px]',
  xl: 'min-h-[500px]',
};

// Dashboard Widget Component
export function DashboardWidget({ widget, isEditing, onResize }: DashboardWidgetProps) {
  const { updateWidget, removeWidget } = useDashboard();
  const [showConfig, setShowConfig] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Handle widget configuration
  const handleConfigToggle = useCallback(() => {
    setShowConfig(!showConfig);
  }, [showConfig]);

  // Handle widget removal
  const handleRemove = useCallback(() => {
    if (widget.removable) {
      removeWidget(widget.id);
    }
  }, [widget.id, widget.removable, removeWidget]);

  // Handle widget visibility toggle
  const handleVisibilityToggle = useCallback(() => {
    updateWidget(widget.id, { visible: !widget.visible });
  }, [widget.id, widget.visible, updateWidget]);

  // Render widget content based on type
  const renderWidgetContent = useCallback(() => {
    switch (widget.type) {
      case 'stats-card':
        return <StatsCardWidget widget={widget} />;
      case 'chart':
        return <ChartWidget widget={widget} />;
      case 'timeline':
        return <TimelineWidget widget={widget} />;
      case 'quick-actions':
        return <QuickActionsWidget widget={widget} />;
      case 'recent-activity':
        return <RecentActivityWidget widget={widget} />;
      case 'intelligence':
        return <IntelligenceWidget widget={widget} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Widget type "{widget.type}" not implemented</p>
          </div>
        );
    }
  }, [widget]);

  return (
    <Card
      className={cn(
        'relative group transition-all duration-200',
        sizeClasses[widget.size],
        isEditing && 'ring-2 ring-primary-200 ring-opacity-50',
        isResizing && 'ring-2 ring-primary-500',
        !widget.visible && 'opacity-50'
      )}
      elevation={isEditing ? 'lg' : 'md'}
      interactive={isEditing}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {widget.title}
        </h3>
        
        {/* Widget Controls */}
        {isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {widget.configurable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConfigToggle}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVisibilityToggle}
              className="h-8 w-8 p-0"
            >
              {widget.visible ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            
            {widget.removable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-move"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="flex-1 overflow-hidden">
        {renderWidgetContent()}
      </div>

      {/* Configuration Panel */}
      {showConfig && widget.configurable && (
        <div className="absolute inset-0 bg-white rounded-lg border-2 border-primary-500 z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Configure Widget</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConfigToggle}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Widget Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={widget.title}
                  onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              {/* Widget Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Widget Size
                </label>
                <select
                  value={widget.size}
                  onChange={(e) => updateWidget(widget.id, { size: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
              
              {/* Widget-specific configuration */}
              <WidgetSpecificConfig widget={widget} />
            </div>
          </div>
        </div>
      )}

      {/* Resize Handles */}
      {isEditing && onResize && (
        <>
          {/* Bottom-right resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
              
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = widget.position.w;
              const startHeight = widget.position.h;
              
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                // Calculate new size based on grid units
                const newW = Math.max(1, startWidth + Math.round(deltaX / 100));
                const newH = Math.max(1, startHeight + Math.round(deltaY / 100));
                
                onResize(widget.id, { w: newW, h: newH });
              };
              
              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="w-full h-full bg-primary-500 rounded-tl-lg opacity-50"></div>
          </div>
        </>
      )}
    </Card>
  );
}

// Widget-specific configuration component
function WidgetSpecificConfig({ widget }: { widget: BaseWidget }) {
  const { updateWidget } = useDashboard();

  switch (widget.type) {
    case 'chart':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chart Type
          </label>
          <select
            value={widget.config?.chartType || 'line'}
            onChange={(e) => updateWidget(widget.id, { 
              config: { ...widget.config, chartType: e.target.value }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="area">Area Chart</option>
          </select>
        </div>
      );
    
    case 'stats-card':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Show Trend
          </label>
          <input
            type="checkbox"
            checked={widget.config?.showTrend || false}
            onChange={(e) => updateWidget(widget.id, { 
              config: { ...widget.config, showTrend: e.target.checked }
            })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      );
    
    default:
      return null;
  }
}