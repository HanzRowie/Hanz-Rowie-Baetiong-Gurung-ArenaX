/**
 * Widget Library
 * Browse and add widgets to the dashboard
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { cn } from '@/design-system/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from './DashboardProvider';
import type { WidgetTemplate, BaseWidget, WidgetType } from '@/types/dashboard.types';
import { UserRole } from '@/types/auth.types';

interface WidgetLibraryProps {
  onClose: () => void;
}

// Widget Templates
const widgetTemplates: WidgetTemplate[] = [
  {
    id: 'stats-card-matches',
    type: 'stats-card',
    name: 'Match Statistics',
    description: 'Display key match statistics and performance metrics',
    icon: '📊',
    defaultSize: 'sm',
    defaultPosition: { x: 0, y: 0, w: 1, h: 1 },
    supportedRoles: [UserRole.PLAYER, UserRole.REFEREE],
    configurable: true,
    removable: true,
  },
  {
    id: 'stats-card-tournaments',
    type: 'stats-card',
    name: 'Tournament Stats',
    description: 'Show tournament participation and success metrics',
    icon: '🏆',
    defaultSize: 'sm',
    defaultPosition: { x: 0, y: 0, w: 1, h: 1 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER],
    configurable: true,
    removable: true,
  },
  {
    id: 'chart-performance',
    type: 'chart',
    name: 'Performance Chart',
    description: 'Interactive chart showing performance over time',
    icon: '📈',
    defaultSize: 'lg',
    defaultPosition: { x: 0, y: 0, w: 2, h: 2 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE],
    configurable: true,
    removable: true,
  },
  {
    id: 'chart-revenue',
    type: 'chart',
    name: 'Revenue Chart',
    description: 'Track revenue and financial performance',
    icon: '💰',
    defaultSize: 'lg',
    defaultPosition: { x: 0, y: 0, w: 2, h: 2 },
    supportedRoles: [UserRole.ORGANIZER, UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
  {
    id: 'timeline-activity',
    type: 'timeline',
    name: 'Activity Timeline',
    description: 'Chronological view of recent activities and events',
    icon: '⏰',
    defaultSize: 'md',
    defaultPosition: { x: 0, y: 0, w: 1, h: 2 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE, UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
  {
    id: 'quick-actions-player',
    type: 'quick-actions',
    name: 'Quick Actions',
    description: 'Fast access to common tasks and features',
    icon: '⚡',
    defaultSize: 'md',
    defaultPosition: { x: 0, y: 0, w: 1, h: 1 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE, UserRole.VENUE_OWNER],
    configurable: false,
    removable: true,
  },
  {
    id: 'recent-activity',
    type: 'recent-activity',
    name: 'Recent Activity',
    description: 'Latest activities and system notifications',
    icon: '🔔',
    defaultSize: 'md',
    defaultPosition: { x: 0, y: 0, w: 1, h: 2 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE, UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
  {
    id: 'upcoming-events',
    type: 'upcoming-events',
    name: 'Upcoming Events',
    description: 'View upcoming tournaments, matches, and appointments',
    icon: '📅',
    defaultSize: 'md',
    defaultPosition: { x: 0, y: 0, w: 2, h: 1 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE],
    configurable: true,
    removable: true,
  },
  {
    id: 'venue-occupancy',
    type: 'venue-occupancy',
    name: 'Venue Occupancy',
    description: 'Visual heatmap of venue utilization',
    icon: '🏢',
    defaultSize: 'lg',
    defaultPosition: { x: 0, y: 0, w: 2, h: 2 },
    supportedRoles: [UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
  {
    id: 'booking-requests',
    type: 'booking-requests',
    name: 'Booking Requests',
    description: 'Manage incoming booking requests',
    icon: '📋',
    defaultSize: 'md',
    defaultPosition: { x: 0, y: 0, w: 1, h: 2 },
    supportedRoles: [UserRole.REFEREE, UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
  {
    id: 'intelligence-insights',
    type: 'intelligence',
    name: 'Smart Insights',
    description: 'AI-powered recommendations and priority information',
    icon: '🧠',
    defaultSize: 'lg',
    defaultPosition: { x: 0, y: 0, w: 2, h: 2 },
    supportedRoles: [UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE, UserRole.VENUE_OWNER],
    configurable: true,
    removable: true,
  },
];

export function WidgetLibrary({ onClose }: WidgetLibraryProps) {
  const { user } = useAuth();
  const { layout, addWidget } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter templates based on user role and search
  const filteredTemplates = useMemo(() => {
    if (!user) return [];

    return widgetTemplates.filter(template => {
      // Role filter
      if (!template.supportedRoles.includes(user.role)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.type.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (selectedCategory !== 'all') {
        return template.type === selectedCategory;
      }

      return true;
    });
  }, [user, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(widgetTemplates.map(t => t.type));
    return Array.from(cats);
  }, []);

  // Handle widget addition
  const handleAddWidget = (template: WidgetTemplate) => {
    if (!layout) return;

    // Find available position
    const existingPositions = layout.widgets.map(w => w.position);
    let newPosition = { ...template.defaultPosition };
    
    // Simple positioning logic - place in first available spot
    let placed = false;
    for (let y = 0; y < 10 && !placed; y++) {
      for (let x = 0; x < layout.columns && !placed; x++) {
        const wouldOverlap = existingPositions.some(pos => 
          x < pos.x + pos.w && x + newPosition.w > pos.x &&
          y < pos.y + pos.h && y + newPosition.h > pos.y
        );
        
        if (!wouldOverlap) {
          newPosition = { ...newPosition, x, y };
          placed = true;
        }
      }
    }

    const newWidget: BaseWidget = {
      id: `${template.id}-${Date.now()}`,
      type: template.type,
      title: template.name,
      size: template.defaultSize,
      position: newPosition,
      visible: true,
      configurable: template.configurable,
      removable: template.removable,
      data: null,
      config: {},
    };

    addWidget(newWidget);
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize',
                selectedCategory === category
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {category.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {filteredTemplates.map(template => (
          <Card
            key={template.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            interactive
            onClick={() => handleAddWidget(template)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                    {template.type.replace('-', ' ')}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {template.defaultSize}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddWidget(template);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No widgets found
          </h3>
          <p className="text-gray-600">
            {searchQuery 
              ? `No widgets match "${searchQuery}"`
              : 'No widgets available for the selected category'
            }
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}