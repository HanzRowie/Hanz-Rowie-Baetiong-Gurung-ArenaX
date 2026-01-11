/**
 * Chart Container
 * Base container for all chart components with common functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, Maximize2, Minimize2, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { cn } from '@/design-system/utils/cn';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
  onFilter?: () => void;
  interactive?: boolean;
  fullscreenEnabled?: boolean;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  loading = false,
  error,
  onRefresh,
  onExport,
  onFilter,
  interactive = true,
  fullscreenEnabled = true,
}: ChartContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!fullscreenEnabled) return;
    
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle export
  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    onExport?.(format);
    setShowExportMenu(false);
  };

  return (
    <Card
      ref={containerRef}
      className={cn(
        'relative transition-all duration-200',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      elevation={isFullscreen ? 'none' : 'md'}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Chart Controls */}
        {interactive && (
          <div className="flex items-center gap-1 ml-4">
            {onFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFilter}
                className="h-8 w-8 p-0"
                title="Filter data"
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}

            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 w-8 p-0"
                title="Refresh data"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}

            {onExport && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="h-8 w-8 p-0"
                  title="Export chart"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {/* Export Menu */}
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button
                      onClick={() => handleExport('png')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg"
                    >
                      Export as PNG
                    </button>
                    <button
                      onClick={() => handleExport('svg')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Export as SVG
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 last:rounded-b-lg"
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {fullscreenEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className={cn(
        'relative',
        isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-full'
      )}>
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-sm text-gray-600">Loading chart data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-sm text-red-600 mb-3">{error}</p>
              {onRefresh && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && children}
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </Card>
  );
}