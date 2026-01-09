import { useState } from 'react';
import {
  Bell,
  Trophy,
  Users,
  Calendar,
  MapPin,
  Star,
  Award,
  MessageCircle,
  Heart,
  Target,
  Clock,
  CheckCircle,
  X,
  Eye,
  ArrowRight,
  Zap,
  Crown,
  TrendingUp,
  Gift,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';

export interface PlayerNotification {
  id: string;
  type: 'tournament_invite' | 'match_reminder' | 'achievement_unlock' | 'connection_request' | 
        'tournament_result' | 'skill_milestone' | 'social_activity' | 'system_update' | 
        'promotional' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
  actions?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: string;
  }>;
  metadata?: {
    tournamentId?: string;
    playerId?: string;
    achievementId?: string;
    matchId?: string;
    [key: string]: any;
  };
  expiresAt?: string;
  image?: string;
  category: 'tournaments' | 'social' | 'achievements' | 'system' | 'reminders';
}

interface NotificationCardProps {
  notification: PlayerNotification;
  onAction?: (notificationId: string, actionId: string) => void;
  onMarkRead?: (notificationId: string) => void;
  onDismiss?: (notificationId: string) => void;
  onView?: (notificationId: string) => void;
  compact?: boolean;
}

export default function NotificationCard({
  notification,
  onAction,
  onMarkRead,
  onDismiss,
  onView,
  compact = false
}: NotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tournament_invite': return Tournament;
      case 'match_reminder': return Clock;
      case 'achievement_unlock': return Award;
      case 'connection_request': return Users;
      case 'tournament_result': return Trophy;
      case 'skill_milestone': return TrendingUp;
      case 'social_activity': return Heart;
      case 'system_update': return Info;
      case 'promotional': return Gift;
      case 'reminder': return Bell;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600 bg-red-100 border-red-200';
    if (priority === 'high') return 'text-orange-600 bg-orange-100 border-orange-200';
    
    switch (type) {
      case 'tournament_invite': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'match_reminder': return 'text-amber-600 bg-amber-100 border-amber-200';
      case 'achievement_unlock': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'connection_request': return 'text-emerald-600 bg-emerald-100 border-emerald-200';
      case 'tournament_result': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'skill_milestone': return 'text-indigo-600 bg-indigo-100 border-indigo-200';
      case 'social_activity': return 'text-pink-600 bg-pink-100 border-pink-200';
      case 'promotional': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: 'bg-red-500', pulse: true };
      case 'high': return { color: 'bg-orange-500', pulse: false };
      case 'medium': return { color: 'bg-blue-500', pulse: false };
      default: return { color: 'bg-gray-400', pulse: false };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
  };

  const isExpired = notification.expiresAt && new Date(notification.expiresAt) < new Date();
  const NotificationIcon = getNotificationIcon(notification.type);
  const colorClasses = getNotificationColor(notification.type, notification.priority);
  const priorityIndicator = getPriorityIndicator(notification.priority);

  if (compact) {
    return (
      <div 
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
          ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300 shadow-sm'}
          ${isExpired ? 'opacity-60' : ''}
          hover:shadow-md
        `}
        onClick={() => onView?.(notification.id)}
      >
        {/* Icon with priority indicator */}
        <div className="relative">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${colorClasses}`}>
            <NotificationIcon className="h-5 w-5" />
          </div>
          {!notification.read && (
            <div className={`
              absolute -top-1 -right-1 w-3 h-3 rounded-full ${priorityIndicator.color}
              ${priorityIndicator.pulse ? 'animate-pulse' : ''}
            `} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{notification.title}</h4>
          <p className="text-sm text-gray-600 truncate">{notification.message}</p>
          <p className="text-xs text-gray-500">{formatTimeAgo(notification.timestamp)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {notification.actionable && notification.actions && notification.actions.length > 0 && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAction?.(notification.id, notification.actions![0].id);
              }}
            >
              {notification.actions[0].label}
            </Button>
          )}
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  // Full notification card
  return (
    <Card className={`
      p-4 transition-all
      ${notification.read ? 'bg-gray-50' : 'bg-white shadow-sm'}
      ${isExpired ? 'opacity-60' : ''}
    `}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Icon with priority indicator */}
            <div className="relative">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${colorClasses}`}>
                <NotificationIcon className="h-6 w-6" />
              </div>
              {!notification.read && (
                <div className={`
                  absolute -top-1 -right-1 w-4 h-4 rounded-full ${priorityIndicator.color}
                  ${priorityIndicator.pulse ? 'animate-pulse' : ''}
                `} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                {notification.priority === 'urgent' && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    Urgent
                  </span>
                )}
                {notification.priority === 'high' && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                    High Priority
                  </span>
                )}
              </div>
              
              <p className="text-gray-700 mb-2">{notification.message}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{formatTimeAgo(notification.timestamp)}</span>
                <span className="capitalize">{notification.category}</span>
                {notification.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {formatTimeAgo(notification.expiresAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notification image */}
          {notification.image && (
            <img
              src={notification.image}
              alt={notification.title}
              className="w-16 h-16 rounded-lg object-cover ml-4"
            />
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && notification.metadata && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(notification.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-gray-600 ml-2">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notification.actionable && notification.actions && notification.actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.type === 'primary' ? 'primary' : action.type === 'danger' ? 'danger' : 'secondary'}
                onClick={() => onAction?.(notification.id, action.id)}
              >
                {action.label}
              </Button>
            ))}
            
            {!notification.actionable && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!notification.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead?.(notification.id)}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss?.(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Helper component for tournament icon
function Tournament({ className }: { className?: string }) {
  return <Trophy className={className} />;
}