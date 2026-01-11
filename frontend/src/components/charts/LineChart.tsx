/**
 * Line Chart Component
 * Interactive line chart with hover effects and drill-down capabilities
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';

export interface LineChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface LineChartSeries {
  id: string;
  name: string;
  data: LineChartDataPoint[];
  color: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  fill?: boolean;
  fillOpacity?: number;
}

export interface LineChartProps {
  series: LineChartSeries[];
  width?: number;
  height?: number;
  className?: string;
  interactive?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  onPointClick?: (point: LineChartDataPoint, series: LineChartSeries) => void;
  onPointHover?: (point: LineChartDataPoint | null, series: LineChartSeries | null) => void;
}

export function LineChart({
  series,
  width = 400,
  height = 300,
  className,
  interactive = true,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  onPointClick,
  onPointHover,
}: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: LineChartDataPoint;
    series: LineChartSeries;
    x: number;
    y: number;
  } | null>(null);

  // Calculate chart dimensions and scales
  const { chartArea, xScale, yScale, xLabels, yTicks } = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartArea = {
      x: padding.left,
      y: padding.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - padding.bottom,
    };

    // Get all data points
    const allPoints = series.flatMap(s => s.data);
    if (allPoints.length === 0) {
      return { chartArea, xScale: () => 0, yScale: () => 0, xLabels: [], yTicks: [] };
    }

    // Calculate scales
    const xValues = allPoints.map(p => p.x);
    const yValues = allPoints.map(p => p.y);
    
    const xMin = Math.min(...xValues.map(x => typeof x === 'number' ? x : 0));
    const xMax = Math.max(...xValues.map(x => typeof x === 'number' ? x : xValues.length - 1));
    const yMin = Math.min(0, Math.min(...yValues));
    const yMax = Math.max(...yValues);

    // Add padding to y-axis
    const yPadding = (yMax - yMin) * 0.1;
    const yMinPadded = yMin - yPadding;
    const yMaxPadded = yMax + yPadding;

    const xScale = (x: string | number) => {
      const numX = typeof x === 'number' ? x : xValues.indexOf(x);
      return chartArea.x + (numX - xMin) / (xMax - xMin) * chartArea.width;
    };

    const yScale = (y: number) => {
      return chartArea.y + chartArea.height - (y - yMinPadded) / (yMaxPadded - yMinPadded) * chartArea.height;
    };

    // Generate labels and ticks
    const xLabels = Array.from(new Set(xValues)).slice(0, 8); // Limit to 8 labels
    const yTicks = Array.from({ length: 6 }, (_, i) => 
      yMinPadded + (yMaxPadded - yMinPadded) * i / 5
    );

    return { chartArea, xScale, yScale, xLabels, yTicks };
  }, [series, width, height]);

  // Generate path for each series
  const generatePath = useCallback((seriesData: LineChartSeries) => {
    if (seriesData.data.length === 0) return '';

    const pathCommands = seriesData.data.map((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return pathCommands.join(' ');
  }, [xScale, yScale]);

  // Generate fill path for area charts
  const generateFillPath = useCallback((seriesData: LineChartSeries) => {
    if (seriesData.data.length === 0 || !seriesData.fill) return '';

    const path = generatePath(seriesData);
    const firstPoint = seriesData.data[0];
    const lastPoint = seriesData.data[seriesData.data.length - 1];
    
    const startX = xScale(firstPoint.x);
    const endX = xScale(lastPoint.x);
    const baseY = yScale(0);

    return `${path} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
  }, [generatePath, xScale, yScale]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !showTooltip) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find closest point
    let closestPoint: { point: LineChartDataPoint; series: LineChartSeries; distance: number } | null = null;

    series.forEach(s => {
      s.data.forEach(point => {
        const pointX = xScale(point.x);
        const pointY = yScale(point.y);
        const distance = Math.sqrt(Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2));

        if (distance < 20 && (!closestPoint || distance < closestPoint.distance)) {
          closestPoint = { point, series: s, distance };
        }
      });
    });

    if (closestPoint) {
      setHoveredPoint({
        point: closestPoint.point,
        series: closestPoint.series,
        x: mouseX,
        y: mouseY,
      });
      onPointHover?.(closestPoint.point, closestPoint.series);
    } else {
      setHoveredPoint(null);
      onPointHover?.(null, null);
    }
  }, [interactive, showTooltip, series, xScale, yScale, onPointHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    onPointHover?.(null, null);
  }, [onPointHover]);

  const handleClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!interactive || !hoveredPoint) return;
    onPointClick?.(hoveredPoint.point, hoveredPoint.series);
  }, [interactive, hoveredPoint, onPointClick]);

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
        <defs>
          {/* Gradients for fill areas */}
          {series.map(s => s.fill && (
            <linearGradient
              key={`gradient-${s.id}`}
              id={`gradient-${s.id}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={s.fillOpacity || 0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-30">
            {/* Horizontal grid lines */}
            {yTicks.map((tick, index) => (
              <line
                key={`h-grid-${index}`}
                x1={chartArea.x}
                y1={yScale(tick)}
                x2={chartArea.x + chartArea.width}
                y2={yScale(tick)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Vertical grid lines */}
            {xLabels.map((label, index) => (
              <line
                key={`v-grid-${index}`}
                x1={xScale(label)}
                y1={chartArea.y}
                x2={xScale(label)}
                y2={chartArea.y + chartArea.height}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* Chart series */}
        {series.map(s => (
          <g key={s.id}>
            {/* Fill area */}
            {s.fill && (
              <path
                d={generateFillPath(s)}
                fill={`url(#gradient-${s.id})`}
                className="transition-opacity duration-200"
              />
            )}
            
            {/* Line */}
            <path
              d={generatePath(s)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth || 2}
              strokeDasharray={s.strokeDashArray}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-200 hover:stroke-width-3"
            />
            
            {/* Data points */}
            {interactive && s.data.map((point, index) => (
              <circle
                key={`${s.id}-point-${index}`}
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r="4"
                fill={s.color}
                className="transition-all duration-200 hover:r-6 cursor-pointer opacity-0 hover:opacity-100"
              />
            ))}
          </g>
        ))}

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
          {/* X-axis labels */}
          {xLabels.map((label, index) => (
            <text
              key={`x-label-${index}`}
              x={xScale(label)}
              y={chartArea.y + chartArea.height + 20}
              textAnchor="middle"
              className="text-xs"
            >
              {label}
            </text>
          ))}
          
          {/* Y-axis labels */}
          {yTicks.map((tick, index) => (
            <text
              key={`y-label-${index}`}
              x={chartArea.x - 10}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="text-xs"
            >
              {tick.toFixed(0)}
            </text>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredPoint && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: hoveredPoint.x + 10,
            top: hoveredPoint.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-medium">{hoveredPoint.series.name}</div>
          <div>
            {hoveredPoint.point.label || hoveredPoint.point.x}: {hoveredPoint.point.y}
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div className="flex items-center gap-4 mt-4 justify-center">
          {series.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm text-gray-700">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}