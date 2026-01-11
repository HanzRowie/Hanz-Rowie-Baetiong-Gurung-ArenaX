/**
 * Contextual Actions Component
 * Dynamic action suggestions based on current context and user behavior
 */

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Clock, 
  Target, 
  Bookmark, 
  Share2, 
  Download,
  Plus,
  Edit,
  Eye,
  MessageCircle,
  Calendar,
  Settings
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/design-system/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

export interface ContextualAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
  shortcut?: string;
  category: 'primary' | 'secondary' | 'utility';
  context: string[];
  relevanceScore: number;
}

interface ContextualActionsProps {
  context: string; // Current page/section context
  entityId?: string; // ID of current entity (tournament, player, etc.)
  entityType?: string; // Type of current entity
  className?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
  maxActions?: number;
  showCategories?: boolean;
}

export function ContextualActions({
  context,
  entityId,
  entityType,
  className,
  layout = 'horizontal',
  maxActions = 6,
  showCategories = false,
}: ContextualActionsProps) {
  const { user } = useAuth();

  // Generate contextual actions based on current context and user role
  const availableActions = useMemo((): ContextualAction[] => {
    if (!user) return [];

    const actions: ContextualAction[] = [];

    // Dashboard context actions
    if (context === 'dashboard') {
      actions.push(
        {
          id: 'quick-tournament-join',
          label: 'Join Tournament',
          description: 'Find and join upcoming tournaments',
          icon: 'plus',
          variant: 'primary',
          onClick: () => console.log('Navigate to tournaments'),
          category: 'primary',
          context: ['dashboard'],
          relevanceScore: user.role === UserRole.PLAYER ? 0.9 : 0.3,
        },
        {
          id: 'create-tournament',
          label: 'Create Tournament',
          description: 'Set up a new tournament',
          icon: 'plus',
          variant: 'primary',
          onClick: () => console.log('Navigate to create tournament'),
          category: 'primary',
          context: ['dashboard'],
          relevanceScore: user.role === UserRole.ORGANIZER ? 0.9 : 0.1,
        },
        {
          id: 'update-availability',
          label: 'Update Availability',
          description: 'Manage your schedule',
          icon: 'calendar',
          variant: 'secondary',
          onClick: () => console.log('Navigate to availability'),
          category: 'primary',
          context: ['dashboard'],
          relevanceScore: user.role === UserRole.REFEREE ? 0.8 : 0.2,
        }
      );
    }

    // Tournament context actions
    if (context === 'tournament' && entityType === 'tournament') {
      actions.push(
        {
          id: 'register-tournament',
          label: 'Register',
          description: 'Join this tournament',
          icon: 'target',
          variant: 'primary',
          onClick: () => console.log('Register for tournament'),
          category: 'primary',
          context: ['tournament'],
          relevanceScore: user.role === UserRole.PLAYER ? 0.95 : 0.1,
        },
        {
          id: 'share-tournament',
          label: 'Share',
          description: 'Share with friends',
          icon: 'share2',
          variant: 'ghost',
          onClick: () => console.log('Share tournament'),
          category: 'utility',
          context: ['tournament'],
          relevanceScore: 0.6,
        },
        {
          id: 'bookmark-tournament',
          label: 'Bookmark',
          description: 'Save for later',
          icon: 'bookmark',
          variant: 'ghost',
          onClick: () => console.log('Bookmark tournament'),
          category: 'utility',
          context: ['tournament'],
          relevanceScore: 0.5,
        },
        {
          id: 'edit-tournament',
          label: 'Edit',
          description: 'Modify tournament details',
          icon: 'edit',
          variant: 'secondary',
          onClick: () => console.log('Edit tournament'),
          category: 'primary',
          context: ['tournament'],
          relevanceScore: user.role === UserRole.ORGANIZER ? 0.9 : 0.0,
        }
      );
    }

    // Player profile context actions
    if (context === 'player-profile' && entityType === 'player') {
      actions.push(
        {
          id: 'message-player',
          label: 'Message',
          description: 'Send a message',
          icon: 'message-circle',
          variant: 'primary',
          onClick: () => console.log('Message player'),
          category: 'primary',
          context: ['player-profile'],
          relevanceScore: 0.8,
        },
        {
          id: 'challenge-player',
          label: 'Challenge',
          description: 'Invite to match',
          icon: 'target',
          variant: 'secondary',
          onClick: () => console.log('Challenge player'),
          category: 'primary',
          context: ['player-profile'],
          relevanceScore: user.role === UserRole.PLAYER ? 0.7 : 0.2,
        },
        {
          id: 'view-stats',
          label: 'View Stats',
          description: 'See detailed statistics',
          icon: 'eye',
          variant: 'ghost',
          onClick: () => console.log('View player stats'),
          category: 'secondary',
          context: ['player-profile'],
          relevanceScore: 0.6,
        }
      );
    }

    // Add time-sensitive actions
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) { // Business hours
      actions.push({
        id: 'contact-support',
        label: 'Get Help',
        description: 'Contact support team',
        icon: 'message-circle',
        variant: 'ghost',
        onClick: () => console.log('Contact support'),
        category: 'utility',
        context: ['dashboard', 'tournament', 'player-profile'],
        relevanceScore: 0.3,
      });
    }

    return actions;
  }, [user, context, entityType, entityId]);

  // Filter and sort actions based on context and relevance
  const contextualActions = useMemo(() => {
    return availableActions
      .filter(action => action.context.includes(context))
      .sort((a, b) => {
        // Sort by relevance score and category
        if (a.category !== b.category) {
          const categoryOrder = { primary: 3, secondary: 2, utility: 1 };
          return categoryOrder[b.category] - categoryOrder[a.category];
        }
        return b.relevanceScore - a.relevanceScore;
      })
      .slice(0, maxActions);
  }, [availableActions, context, maxActions]);

  const getIcon = (iconName: string) => {
    const iconClass = "h-4 w-4";
    
    switch (iconName) {
      case 'plus':
        return <Plus className={iconClass} />;
      case 'edit':
        return <Edit className={iconClass} />;
      case 'eye':
        return <Eye className={iconClass} />;
      case 'target':
        return <Target className={iconClass} />;
      case 'bookmark':
        return <Bookmark className={iconClass} />;
      case 'share2':
        return <Share2 className={iconClass} />;
      case 'download':
        return <Download className={iconClass} />;
      case 'message-circle':
        return <MessageCircle className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'settings':
        return <Settings className={iconClass} />;
      case 'clock':
        return <Clock className={iconClass} />;
      default:
        return <Zap className={iconClass} />;
    }
  };

  const groupedActions = useMemo(() => {
    if (!showCategories) return { all: contextualActions };
    
    return contextualActions.reduce((groups, action) => {
      const category = action.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
      return groups;
    }, {} as Record<string, ContextualAction[]>);
  }, [contextualActions, showCategories]);

  if (contextualActions.length === 0) {
    return null;
  }

  const renderActions = (actions: ContextualAction[]) => {
    const layoutClasses = {
      horizontal: 'flex items-center gap-2 flex-wrap',
      vertical: 'flex flex-col gap-2',
      grid: 'grid grid-cols-2 md:grid-cols-3 gap-2',
    };

    return (
      <div className={layoutClasses[layout]}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'secondary'}
            size={action.size || 'sm'}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'gap-2 relative',
              layout === 'grid' && 'justify-start',
              action.relevanceScore > 0.8 && 'ring-2 ring-primary-200'
            )}
            title={action.description}
          >
            {getIcon(action.icon)}
            <span className="truncate">{action.label}</span>
            
            {action.badge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {action.badge}
              </span>
            )}
            
            {action.shortcut && (
              <span className="hidden md:inline text-xs text-gray-500 ml-auto">
                {action.shortcut}
              </span>
            )}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {showCategories ? (
        Object.entries(groupedActions).map(([category, actions]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
              {category} Actions
            </h4>
            {renderActions(actions)}
          </div>
        ))
      ) : (
        renderActions(contextualActions)
      )}
    </div>
  );
}

// Quick Actions Floating Button
interface QuickActionsFloatingProps {
  context: string;
  className?: string;
}

export function QuickActionsFloating({
  context,
  className,
}: QuickActionsFloatingProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      <div className="relative">
        {/* Main FAB */}
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Zap className="h-6 w-6" />
        </Button>

        {/* Action Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px]">
            <ContextualActions
              context={context}
              layout="vertical"
              maxActions={4}
              className="space-y-1"
            />
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}