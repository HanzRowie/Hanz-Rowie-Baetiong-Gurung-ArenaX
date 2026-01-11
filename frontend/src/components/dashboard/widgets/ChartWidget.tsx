/**
 * Chart Widget
 * Interactive chart component with multiple visualization types
 */

import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { ChartContainer, LineChart, BarChart, PieChart } from '@/components/charts';
import { cn } from '@/design-system/utils/cn';
import type { BaseWidget, ChartData } from '@/types/dashboard.types';
import type { LineChartSeries, BarChartDataPoint, PieChartDataPoint } from '@/components/charts';

interface ChartWidgetProps {
  widget: BaseWidget;
}

export function ChartWidget({ widget }: ChartWidgetProps) {
  const chartType = widget.config?.chartType || 'line';
  
  // Mock data - in real implementation, this would come from widget.data
  const data: ChartData = widget.data || {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Performance',
      data: [65, 78, 90, 81, 95, 88],
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2
    }]
  };

  // Transform data for different chart types
  const chartData = useMemo(() => {
    switch (chartType) {
      case 'line':
        const lineSeries: LineChartSeries[] = data.datasets.map(dataset => ({
          id: dataset.label,
          name: dataset.label,
          data: data.labels.map((label, index) => ({
            x: label,
            y: dataset.data[index] || 0,
            label: label
          })),
          color: dataset.borderColor || '#6366f1',
          strokeWidth: dataset.borderWidth || 2,
          fill: !!dataset.backgroundColor,
          fillOpacity: 0.1
        }));
        return { type: 'line', data: lineSeries };

      case 'bar':
        const barData: BarChartDataPoint[] = data.labels.map((label, index) => ({
          label: label,
          value: data.datasets[0]?.data[index] || 0,
          color: Array.isArray(data.datasets[0]?.backgroundColor) 
            ? data.datasets[0].backgroundColor[index] 
            : data.datasets[0]?.backgroundColor || '#6366f1'
        }));
        return { type: 'bar', data: barData };

      case 'pie':
        const pieData: PieChartDataPoint[] = data.labels.map((label, index) => ({
          label: label,
          value: data.datasets[0]?.data[index] || 0,
          color: Array.isArray(data.datasets[0]?.backgroundColor) 
            ? data.datasets[0].backgroundColor[index] 
            : undefined
        }));
        return { type: 'pie', data: pieData };

      default:
        return { type: 'line', data: [] };
    }
  }, [chartType, data]);

  const getChartIcon = () => {
    switch (chartType) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'line':
        return <TrendingUp className="h-4 w-4" />;
      case 'pie':
        return <PieChartIcon className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    console.log(`Exporting chart as ${format}`);
    // Implementation would depend on the chart library used
  };

  const handleRefresh = () => {
    console.log('Refreshing chart data');
    // Implementation would fetch new data
  };

  const renderChart = () => {
    const commonProps = {
      width: 400,
      height: 250,
      interactive: true,
    };

    switch (chartData.type) {
      case 'line':
        return (
          <LineChart
            {...commonProps}
            series={chartData.data as LineChartSeries[]}
            showGrid={true}
            showLegend={chartData.data.length > 1}
            showTooltip={true}
            onPointClick={(point, series) => {
              console.log('Point clicked:', point, series);
            }}
          />
        );

      case 'bar':
        return (
          <BarChart
            {...commonProps}
            data={chartData.data as BarChartDataPoint[]}
            orientation="vertical"
            showGrid={true}
            showValues={false}
            showTooltip={true}
            onBarClick={(dataPoint, index) => {
              console.log('Bar clicked:', dataPoint, index);
            }}
          />
        );

      case 'pie':
        return (
          <PieChart
            {...commonProps}
            width={300}
            height={300}
            data={chartData.data as PieChartDataPoint[]}
            innerRadius={widget.config?.donut ? 60 : 0}
            showLabels={true}
            showLegend={true}
            showTooltip={true}
            showPercentages={true}
            onSliceClick={(dataPoint, index) => {
              console.log('Slice clicked:', dataPoint, index);
            }}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Activity className="h-8 w-8 mb-2 mx-auto" />
              <p className="text-sm">Chart type not supported</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ChartContainer
      title={widget.title}
      subtitle={`${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`}
      onExport={handleExport}
      onRefresh={handleRefresh}
      interactive={true}
      className="h-full"
    >
      <div className="flex items-center justify-center h-full">
        {renderChart()}
      </div>
    </ChartContainer>
  );
}