/**
 * Quick Actions Widget
 * Displays contextual action buttons for common tasks
 */

import React from 'react';
import { Plus, Calendar, Users, Settings, Eye, Trophy, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/design-system/utils/cn';
import { UserRole } from '@/types/auth.types';
import type { BaseWidget, QuickAction } from '@/types/dashboard.types';

interface QuickActionsWidgetProps {
  widget: BaseWidget;
}

export function QuickActionsWidget({ widget }: QuickActionsWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Generate role-specific quick actions
  const getQuickActions = (): QuickAction[] => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.PLAYER:
        return [
          {
            id: 'join-tournament',
            label: 'Join Tournament',
            description: 'Find and register for tournaments',
            icon: 'trophy',
            action: () => navigate('/tournaments'),
            color: 'purple'
          },
          {
            id: 'find-players',
            label: 'Find Players',
            description: 'Connect with other players',
            icon: 'users',
            action: () => navigate('/players'),
            color: 'blue'
          },
          {
            id: 'view-schedule',
            label: 'My Schedule',
            description: 'View upcoming matches',
            icon: 'calendar',
            action: () => navigate('/schedule'),
            color: 'green'
          },
          {
            id: 'update-profile',
            label: 'Update Profile',
            description: 'Edit your player profile',
            icon: 'settings',
            action: () => navigate('/profile'),
            color: 'gray'
          }
        ];

      case UserRole.ORGANIZER:
        return [
          {
            id: 'create-tournament',
            label: 'Create Tournament',
            description: 'Set up a new tournament',
            icon: 'plus',
            action: () => navigate('/tournaments/create'),
            color: 'purple'
          },
          {
            id: 'manage-tournaments',
            label: 'Manage Tournaments',
            description: 'View and edit your tournaments',
            icon: 'eye',
            action: () => navigate('/my-tournaments'),
            color: 'blue'
          },
          {
            id: 'view-analytics',
            label: 'View Analytics',
            description: 'Tournament performance metrics',
            icon: 'settings',
            action: () => navigate('/analytics'),
            color: 'green'
          },
          {
            id: 'find-venues',
            label: 'Find Venues',
            description: 'Browse available venues',
            icon: 'map-pin',
            action: () => navigate('/venues'),
            color: 'orange'
          }
        ];

      case UserRole.REFEREE:
        return [
          {
            id: 'set-availability',
            label: 'Set Availability',
            description: 'Update your schedule',
            icon: 'calendar',
            action: () => navigate('/referee/availability'),
            color: 'green'
          },
          {
            id: 'view-bookings',
            label: 'View Bookings',
            description: 'Manage booking requests',
            icon: 'eye',
            action: () => navigate('/referee/bookings'),
            color: 'blue'
          },
          {
            id: 'view-schedule',
            label: 'My Schedule',
            description: 'Upcoming assignments',
            icon: 'calendar',
            action: () => navigate('/referee/schedule'),
            color: 'purple'
          },
          {
            id: 'update-profile',
            label: 'Update Profile',
            description: 'Edit referee information',
            icon: 'settings',
            action: () => navigate('/profile'),
            color: 'gray'
          }
        ];

      case UserRole.VENUE_OWNER:
        return [
          {
            id: 'add-venue',
            label: 'Add Venue',
            description: 'List a new venue',
            icon: 'plus',
            action: () => navigate('/venue-management'),
            color: 'purple'
          },
          {
            id: 'manage-venues',
            label: 'Manage Venues',
            description: 'Edit venue details',
            icon: 'settings',
            action: () => navigate('/venue-management'),
            color: 'blue'
          },
          {
            id: 'view-bookings',
            label: 'View Bookings',
            description: 'Manage reservations',
            icon: 'calendar',
            action: () => navigate('/venue-bookings'),
            color: 'green'
          },
          {
            id: 'view-analytics',
            label: 'View Analytics',
            description: 'Revenue and occupancy',
            icon: 'eye',
            action: () => navigate('/venue-analytics'),
            color: 'orange'
          }
        ];

      default:
        return [];
    }
  };

  const quickActions = widget.data || getQuickActions();

  const getIcon = (iconName: string) => {
    const iconClass = "h-5 w-5";
    
    switch (iconName) {
      case 'plus':
        return <Plus className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'settings':
        return <Settings className={iconClass} />;
      case 'eye':
        return <Eye className={iconClass} />;
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'map-pin':
        return <MapPin className={iconClass} />;
      default:
        return <Plus className={iconClass} />;
    }
  };

  const getButtonVariant = (color: string) => {
    switch (color) {
      case 'purple':
        return 'primary';
      case 'blue':
      case 'green':
      case 'orange':
        return 'secondary';
      default:
        return 'ghost';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          Quick Actions
        </span>
      </div>

      {/* Actions Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 gap-3">
          {quickActions.slice(0, 4).map((action) => (
            <Button
              key={action.id}
              variant={getButtonVariant(action.color)}
              onClick={action.action}
              disabled={action.disabled}
              className={cn(
                'h-auto p-4 justify-start text-left',
                'hover:scale-102 transition-transform duration-200'
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg',
                  action.color === 'purple' && 'bg-purple-100 text-purple-600',
                  action.color === 'blue' && 'bg-blue-100 text-blue-600',
                  action.color === 'green' && 'bg-green-100 text-green-600',
                  action.color === 'orange' && 'bg-orange-100 text-orange-600',
                  action.color === 'gray' && 'bg-gray-100 text-gray-600'
                )}>
                  {getIcon(action.icon)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {action.label}
                  </div>
                  {action.description && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {action.description}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Show More Actions */}
      {quickActions.length > 4 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Show {quickActions.length - 4} more actions →
          </button>
        </div>
      )}
    </div>
  );
}