/**
 * Pie Chart Component
 * Interactive pie chart with hover effects and drill-down capabilities
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';

export interface PieChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  width?: number;
  height?: number;
  className?: string;
  innerRadius?: number;
  interactive?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showPercentages?: boolean;
  onSliceClick?: (dataPoint: PieChartDataPoint, index: number) => void;
  onSliceHover?: (dataPoint: PieChartDataPoint | null, index: number | null) => void;
}

const defaultColors = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#6b7280'
];

export function PieChart({
  data,
  width = 300,
  height = 300,
  className,
  innerRadius = 0,
  interactive = true,
  showLabels = true,
  showLegend = true,
  showTooltip = true,
  showPercentages = false,
  onSliceClick,
  onSliceHover,
}: PieChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<{
    dataPoint: PieChartDataPoint;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate chart dimensions
  const { center, radius } = useMemo(() => {
    const size = Math.min(width, height);
    const center = { x: width / 2, y: height / 2 };
    const radius = (size / 2) - 20; // 20px padding
    
    return { center, radius };
  }, [width, height]);

  // Process data and calculate angles
  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2; // Start at top

    return data.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Calculate label position
      const labelAngle = startAngle + angle / 2;
      const labelRadius = radius * 0.7;
      const labelX = center.x + Math.cos(labelAngle) * labelRadius;
      const labelY = center.y + Math.sin(labelAngle) * labelRadius;

      // Calculate path for slice
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const x1 = center.x + Math.cos(startAngle) * radius;
      const y1 = center.y + Math.sin(startAngle) * radius;
      const x2 = center.x + Math.cos(endAngle) * radius;
      const y2 = center.y + Math.sin(endAngle) * radius;

      let path = `M ${center.x} ${center.y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // For donut chart (inner radius > 0)
      if (innerRadius > 0) {
        const innerX1 = center.x + Math.cos(startAngle) * innerRadius;
        const innerY1 = center.y + Math.sin(startAngle) * innerRadius;
        const innerX2 = center.x + Math.cos(endAngle) * innerRadius;
        const innerY2 = center.y + Math.sin(endAngle) * innerRadius;
        
        path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1} Z`;
      }

      currentAngle = endAngle;

      return {
        ...item,
        color: item.color || defaultColors[index % defaultColors.length],
        percentage,
        startAngle,
        endAngle,
        labelX,
        labelY,
        path,
        index,
      };
    });
  }, [data, center, radius, innerRadius]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !showTooltip) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate angle from center to mouse
    const dx = mouseX - center.x;
    const dy = mouseY - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if mouse is within the chart area
    if (distance < innerRadius || distance > radius) {
      setHoveredSlice(null);
      onSliceHover?.(null, null);
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += 2 * Math.PI;

    // Find which slice the mouse is over
    const hoveredSliceData = processedData.find(slice => 
      angle >= slice.startAngle && angle <= slice.endAngle
    );

    if (hoveredSliceData) {
      setHoveredSlice({
        dataPoint: hoveredSliceData,
        index: hoveredSliceData.index,
        x: mouseX,
        y: mouseY,
      });
      onSliceHover?.(hoveredSliceData, hoveredSliceData.index);
    } else {
      setHoveredSlice(null);
      onSliceHover?.(null, null);
    }
  }, [interactive, showTooltip, center, radius, innerRadius, processedData, onSliceHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSlice(null);
    onSliceHover?.(null, null);
  }, [onSliceHover]);

  const handleClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !hoveredSlice) return;
    onSliceClick?.(hoveredSlice.dataPoint, hoveredSlice.index);
  }, [interactive, hoveredSlice, onSliceClick]);

  if (processedData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ width, height }}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Pie slices */}
        <g>
          {processedData.map((slice, index) => (
            <path
              key={`slice-${index}`}
              d={slice.path}
              fill={slice.color}
              className={cn(
                'transition-all duration-200',
                interactive && 'hover:opacity-80 cursor-pointer'
              )}
              opacity={hoveredSlice?.index === index ? 0.8 : 1}
              transform={hoveredSlice?.index === index ? 'scale(1.05)' : 'scale(1)'}
              transformOrigin={`${center.x} ${center.y}`}
            />
          ))}
        </g>

        {/* Labels */}
        {showLabels && (
          <g className="text-xs fill-gray-700">
            {processedData.map((slice, index) => {
              // Only show label if slice is large enough
              if (slice.percentage < 5) return null;
              
              return (
                <text
                  key={`label-${index}`}
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                  className="text-xs font-medium pointer-events-none"
                  fill="white"
                >
                  {showPercentages ? `${slice.percentage.toFixed(1)}%` : slice.label}
                </text>
              );
            })}
          </g>
        )}

        {/* Center label for donut charts */}
        {innerRadius > 0 && (
          <g className="text-center">
            <text
              x={center.x}
              y={center.y - 5}
              textAnchor="middle"
              className="text-lg font-bold fill-gray-900"
            >
              {processedData.reduce((sum, slice) => sum + slice.value, 0)}
            </text>
            <text
              x={center.x}
              y={center.y + 15}
              textAnchor="middle"
              className="text-sm fill-gray-600"
            >
              Total
            </text>
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredSlice && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredSlice.x + 10,
            top: hoveredSlice.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-medium">{hoveredSlice.dataPoint.label}</div>
          <div>Value: {hoveredSlice.dataPoint.value}</div>
          <div>Percentage: {hoveredSlice.dataPoint.percentage.toFixed(1)}%</div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 mt-4 justify-center">
          {processedData.map((slice, index) => (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-gray-700">{slice.label}</span>
              {showPercentages && (
                <span className="text-xs text-gray-500">
                  ({slice.percentage.toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}