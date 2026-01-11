/**
 * Bar Chart Component
 * Interactive bar chart with hover effects and drill-down capabilities
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  width?: number;
  height?: number;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  interactive?: boolean;
  showGrid?: boolean;
  showValues?: boolean;
  showTooltip?: boolean;
  barSpacing?: number;
  onBarClick?: (dataPoint: BarChartDataPoint, index: number) => void;
  onBarHover?: (dataPoint: BarChartDataPoint | null, index: number | null) => void;
}

export function BarChart({
  data,
  width = 400,
  height = 300,
  className,
  orientation = 'vertical',
  interactive = true,
  showGrid = true,
  showValues = false,
  showTooltip = true,
  barSpacing = 0.2,
  onBarClick,
  onBarHover,
}: BarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{
    dataPoint: BarChartDataPoint;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate chart dimensions and scales
  const { chartArea, scale, maxValue, barWidth } = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const chartArea = {
      x: padding.left,
      y: padding.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - padding.bottom,
    };

    if (data.length === 0) {
      return { chartArea, scale: () => 0, maxValue: 0, barWidth: 0 };
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(0, Math.min(...data.map(d => d.value)));
    
    // Add padding to the scale
    const valuePadding = (maxValue - minValue) * 0.1;
    const scaledMax = maxValue + valuePadding;
    const scaledMin = minValue - valuePadding;

    const scale = (value: number) => {
      if (orientation === 'vertical') {
        return chartArea.y + chartArea.height - (value - scaledMin) / (scaledMax - scaledMin) * chartArea.height;
      } else {
        return chartArea.x + (value - scaledMin) / (scaledMax - scaledMin) * chartArea.width;
      }
    };

    const availableSpace = orientation === 'vertical' ? chartArea.width : chartArea.height;
    const barWidth = (availableSpace / data.length) * (1 - barSpacing);

    return { chartArea, scale, maxValue: scaledMax, barWidth };
  }, [data, width, height, orientation, barSpacing]);

  // Generate bars
  const bars = useMemo(() => {
    return data.map((dataPoint, index) => {
      const barColor = dataPoint.color || '#6366f1';
      
      if (orientation === 'vertical') {
        const x = chartArea.x + (index + barSpacing / 2) * (chartArea.width / data.length);
        const y = scale(dataPoint.value);
        const barHeight = scale(0) - y;
        
        return {
          x,
          y,
          width: barWidth,
          height: Math.abs(barHeight),
          color: barColor,
          dataPoint,
          index,
        };
      } else {
        const x = scale(0);
        const y = chartArea.y + (index + barSpacing / 2) * (chartArea.height / data.length);
        const barWidth = scale(dataPoint.value) - x;
        
        return {
          x,
          y,
          width: Math.abs(barWidth),
          height: barWidth,
          color: barColor,
          dataPoint,
          index,
        };
      }
    });
  }, [data, chartArea, scale, barWidth, barSpacing, orientation]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const tickCount = 5;
    
    for (let i = 0; i <= tickCount; i++) {
      const value = (maxValue / tickCount) * i;
      const position = scale(value);
      
      if (orientation === 'vertical') {
        lines.push({
          x1: chartArea.x,
          y1: position,
          x2: chartArea.x + chartArea.width,
          y2: position,
          label: value.toFixed(0),
          labelX: chartArea.x - 10,
          labelY: position + 4,
        });
      } else {
        lines.push({
          x1: position,
          y1: chartArea.y,
          x2: position,
          y2: chartArea.y + chartArea.height,
          label: value.toFixed(0),
          labelX: position,
          labelY: chartArea.y + chartArea.height + 20,
        });
      }
    }
    
    return lines;
  }, [maxValue, scale, chartArea, orientation]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !showTooltip) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find hovered bar
    const hoveredBarData = bars.find(bar => {
      return mouseX >= bar.x && 
             mouseX <= bar.x + bar.width && 
             mouseY >= bar.y && 
             mouseY <= bar.y + bar.height;
    });

    if (hoveredBarData) {
      setHoveredBar({
        dataPoint: hoveredBarData.dataPoint,
        index: hoveredBarData.index,
        x: mouseX,
        y: mouseY,
      });
      onBarHover?.(hoveredBarData.dataPoint, hoveredBarData.index);
    } else {
      setHoveredBar(null);
      onBarHover?.(null, null);
    }
  }, [interactive, showTooltip, bars, onBarHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredBar(null);
    onBarHover?.(null, null);
  }, [onBarHover]);

  const handleClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !hoveredBar) return;
    onBarClick?.(hoveredBar.dataPoint, hoveredBar.index);
  }, [interactive, hoveredBar, onBarClick]);

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
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-30">
            {gridLines.map((line, index) => (
              <line
                key={`grid-${index}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* Bars */}
        <g>
          {bars.map((bar, index) => (
            <rect
              key={`bar-${index}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              className={cn(
                'transition-all duration-200',
                interactive && 'hover:opacity-80 cursor-pointer'
              )}
              opacity={hoveredBar?.index === index ? 0.8 : 1}
            />
          ))}
        </g>

        {/* Value labels */}
        {showValues && (
          <g className="text-xs fill-gray-700">
            {bars.map((bar, index) => {
              const value = bar.dataPoint.value;
              const labelX = orientation === 'vertical' 
                ? bar.x + bar.width / 2 
                : bar.x + bar.width + 5;
              const labelY = orientation === 'vertical' 
                ? bar.y - 5 
                : bar.y + bar.height / 2 + 4;
              
              return (
                <text
                  key={`value-${index}`}
                  x={labelX}
                  y={labelY}
                  textAnchor={orientation === 'vertical' ? 'middle' : 'start'}
                  className="text-xs font-medium"
                >
                  {value}
                </text>
              );
            })}
          </g>
        )}

        {/* Axes */}
        <g>
          {/* X-axis */}
          <line
            x1={chartArea.x}
            y1={chartArea.y + chartArea.height}
            x2={chartArea.x + chartArea.width}
            y2={chartArea.y + chartArea.height}
            stroke="#374151"
            strokeWidth="1"
          />
          
          {/* Y-axis */}
          <line
            x1={chartArea.x}
            y1={chartArea.y}
            x2={chartArea.x}
            y2={chartArea.y + chartArea.height}
            stroke="#374151"
            strokeWidth="1"
          />
        </g>

        {/* Axis labels */}
        <g className="text-xs fill-gray-600">
          {/* Grid line labels */}
          {gridLines.map((line, index) => (
            <text
              key={`grid-label-${index}`}
              x={line.labelX}
              y={line.labelY}
              textAnchor={orientation === 'vertical' ? 'end' : 'middle'}
              className="text-xs"
            >
              {line.label}
            </text>
          ))}
          
          {/* Category labels */}
          {data.map((dataPoint, index) => {
            const bar = bars[index];
            const labelX = orientation === 'vertical' 
              ? bar.x + bar.width / 2 
              : chartArea.x - 10;
            const labelY = orientation === 'vertical' 
              ? chartArea.y + chartArea.height + 20 
              : bar.y + bar.height / 2 + 4;
            
            return (
              <text
                key={`category-${index}`}
                x={labelX}
                y={labelY}
                textAnchor={orientation === 'vertical' ? 'middle' : 'end'}
                className="text-xs"
              >
                {dataPoint.label}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredBar && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredBar.x + 10,
            top: hoveredBar.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-medium">{hoveredBar.dataPoint.label}</div>
          <div>Value: {hoveredBar.dataPoint.value}</div>
        </div>
      )}
    </div>
  );
}