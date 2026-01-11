/**
 * Dashboard Grid
 * Responsive grid layout for dashboard widgets with drag-and-drop support
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { cn } from '@/design-system/utils/cn';
import { useDashboard } from './DashboardProvider';
import { DashboardWidget } from './DashboardWidget';
import type { BaseWidget, WidgetPosition } from '@/types/dashboard.types';

// Detect touch device
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Grid Item Props
interface GridItemProps {
  widget: BaseWidget;
  isEditing: boolean;
  onMove: (widgetId: string, position: WidgetPosition) => void;
  onResize: (widgetId: string, newSize: { w: number; h: number }) => void;
}

// Draggable Grid Item
function DraggableGridItem({ widget, isEditing, onMove, onResize }: GridItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'widget',
    item: { id: widget.id, type: 'widget' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isEditing,
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'widget',
    drop: (item: { id: string }, monitor) => {
      if (item.id !== widget.id && monitor.isOver({ shallow: true })) {
        // Calculate new position based on drop target
        const newPosition: WidgetPosition = {
          ...widget.position,
          // This would be calculated based on the actual drop position
        };
        onMove(item.id, newPosition);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  // Combine drag and drop refs
  const ref = useCallback((node: HTMLDivElement | null) => {
    drag(drop(node));
  }, [drag, drop]);

  // Grid item styles based on widget size and position
  const gridItemStyles = useMemo(() => {
    const { x, y, w, h } = widget.position;
    return {
      gridColumn: `${x + 1} / span ${w}`,
      gridRow: `${y + 1} / span ${h}`,
    };
  }, [widget.position]);

  return (
    <div
      ref={ref}
      style={gridItemStyles}
      className={cn(
        'relative transition-all duration-200 ease-out',
        isDragging && 'opacity-50 scale-95',
        isOver && 'ring-2 ring-primary-500 ring-opacity-50',
        isEditing && 'cursor-move'
      )}
    >
      <DashboardWidget
        widget={widget}
        isEditing={isEditing}
        onResize={onResize}
      />
    </div>
  );
}

// Dashboard Grid Props
interface DashboardGridProps {
  className?: string;
}

// Dashboard Grid Component
export function DashboardGrid({ className }: DashboardGridProps) {
  const { layout, isEditing, moveWidget } = useDashboard();

  // Handle widget move
  const handleMove = useCallback((widgetId: string, position: WidgetPosition) => {
    moveWidget(widgetId, position);
  }, [moveWidget]);

  // Handle widget resize
  const handleResize = useCallback((widgetId: string, newSize: { w: number; h: number }) => {
    const widget = layout?.widgets.find(w => w.id === widgetId);
    if (widget) {
      const newPosition: WidgetPosition = {
        ...widget.position,
        w: newSize.w,
        h: newSize.h,
      };
      moveWidget(widgetId, newPosition);
    }
  }, [layout?.widgets, moveWidget]);

  // Grid configuration
  const gridConfig = useMemo(() => {
    if (!layout) return { columns: 12, rows: 'auto' };
    
    const spacing = layout.spacing === 'compact' ? 'gap-2' : 
                   layout.spacing === 'comfortable' ? 'gap-4' : 'gap-6';
    
    return {
      columns: layout.columns || 12,
      spacing,
    };
  }, [layout]);

  // Calculate grid template columns
  const gridTemplateColumns = useMemo(() => {
    return `repeat(${gridConfig.columns}, minmax(0, 1fr))`;
  }, [gridConfig.columns]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <div
        className={cn(
          'grid auto-rows-min',
          gridConfig.spacing,
          'min-h-screen',
          isEditing && 'bg-gray-50/50 rounded-lg p-4',
          className
        )}
        style={{
          gridTemplateColumns,
        }}
      >
        {layout.widgets
          .filter(widget => widget.visible)
          .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
          .map((widget) => (
            <DraggableGridItem
              key={widget.id}
              widget={widget}
              isEditing={isEditing}
              onMove={handleMove}
              onResize={handleResize}
            />
          ))}
        
        {/* Edit Mode Overlay */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 pointer-events-none">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 pointer-events-auto">
              <p className="text-sm font-medium text-gray-900">
                Drag widgets to rearrange • Click outside to save
              </p>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// Grid Helper Components

// Empty Grid Slot (for showing drop zones in edit mode)
interface EmptyGridSlotProps {
  position: WidgetPosition;
  onDrop: (position: WidgetPosition) => void;
}

export function EmptyGridSlot({ position, onDrop }: EmptyGridSlotProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'widget',
    drop: () => onDrop(position),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={cn(
        'border-2 border-dashed border-gray-300 rounded-lg',
        'flex items-center justify-center',
        'min-h-[120px] transition-colors',
        isOver && 'border-primary-500 bg-primary-50'
      )}
      style={{
        gridColumn: `${position.x + 1} / span ${position.w}`,
        gridRow: `${position.y + 1} / span ${position.h}`,
      }}
    >
      <p className="text-sm text-gray-500">Drop widget here</p>
    </div>
  );
}

// Grid Guidelines (for showing grid structure in edit mode)
export function GridGuidelines({ columns }: { columns: number }) {
  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: `calc(100% / ${columns}) 40px`,
      }}
    />
  );
}