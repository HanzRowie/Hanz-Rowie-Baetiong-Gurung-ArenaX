import { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import NotificationCenter from '@/components/player/NotificationCenter';
import NotificationPreferences from '@/components/player/NotificationPreferences';
import { type PlayerNotification } from '@/components/player/NotificationCard';
import { type NotificationPreference } from '@/components/player/NotificationPreferences';

// Mock data for demonstration
const mockNotifications: PlayerNotification[] = [
  {
    id: '1',
    type: 'tournament_invite',
    priority: 'high',
    title: 'Tournament Invitation',
    message: 'You\'ve been invited to the "Summer Tennis Championship" starting next week.',
    timestamp: new Date().toISOString(),
    read: false,
    actionable: true,
    actions: [
      { id: 'accept', label: 'Accept', type: 'primary', action: 'accept_tournament' },
      { id: 'decline', label: 'Decline', type: 'secondary', action: 'decline_tournament' }
    ],
    metadata: { tournamentId: 'tournament_123' },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    image: '/api/placeholder/400/300',
    category: 'tournaments'
  },
  {
    id: '2',
    type: 'achievement_unlock',
    priority: 'medium',
    title: 'Achievement Unlocked!',
    message: 'Congratulations! You\'ve earned the "Rising Star" achievement for winning 5 matches in a row.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    actionable: false,
    metadata: { achievementId: 'rising_star' },
    image: '/api/placeholder/400/300',
    category: 'achievements'
  },
  {
    id: '3',
    type: 'connection_request',
    priority: 'medium',
    title: 'New Connection Request',
    message: 'Alex Johnson wants to connect with you. You have 2 mutual connections.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionable: true,
    actions: [
      { id: 'accept', label: 'Accept', type: 'primary', action: 'accept_connection' },
      { id: 'decline', label: 'Decline', type: 'secondary', action: 'decline_connection' }
    ],
    metadata: { playerId: 'player_456' },
    category: 'social'
  },
  {
    id: '4',
    type: 'match_reminder',
    priority: 'urgent',
    title: 'Match Starting Soon',
    message: 'Your match against Sarah Wilson starts in 30 minutes at Central Sports Complex.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    actionable: true,
    actions: [
      { id: 'confirm', label: 'I\'m Ready', type: 'primary', action: 'confirm_attendance' }
    ],
    metadata: { matchId: 'match_789' },
    category: 'reminders'
  },
  {
    id: '5',
    type: 'tournament_result',
    priority: 'medium',
    title: 'Tournament Results Available',
    message: 'Final results for the "City Championship" are now available. You finished 3rd place!',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionable: false,
    metadata: { tournamentId: 'tournament_456' },
    category: 'tournaments'
  }
];

const mockPreferences: NotificationPreference[] = [
  {
    id: 'tournament_invites',
    category: 'tournaments',
    type: 'tournament_invite',
    label: 'Tournament Invitations',
    description: 'Get notified when you\'re invited to tournaments',
    enabled: true,
    channels: { push: true, email: true, inApp: true },
    timing: { immediate: true, digest: false, quietHours: false },
    priority: 'high'
  },
  {
    id: 'match_reminders',
    category: 'reminders',
    type: 'match_reminder',
    label: 'Match Reminders',
    description: 'Reminders before your scheduled matches',
    enabled: true,
    channels: { push: true, email: false, inApp: true, sms: true },
    timing: { immediate: true, digest: false, quietHours: false },
    priority: 'urgent'
  },
  {
    id: 'achievement_unlocks',
    category: 'achievements',
    type: 'achievement_unlock',
    label: 'Achievement Unlocks',
    description: 'Celebrate when you unlock new achievements',
    enabled: true,
    channels: { push: true, email: false, inApp: true },
    timing: { immediate: true, digest: true, quietHours: true },
    priority: 'medium'
  },
  {
    id: 'connection_requests',
    category: 'social',
    type: 'connection_request',
    label: 'Connection Requests',
    description: 'When other players want to connect with you',
    enabled: true,
    channels: { push: true, email: true, inApp: true },
    timing: { immediate: true, digest: true, quietHours: true },
    priority: 'medium'
  },
  {
    id: 'tournament_results',
    category: 'tournaments',
    type: 'tournament_result',
    label: 'Tournament Results',
    description: 'Final results and rankings for completed tournaments',
    enabled: true,
    channels: { push: false, email: true, inApp: true },
    timing: { immediate: false, digest: true, quietHours: true },
    priority: 'low'
  },
  {
    id: 'skill_milestones',
    category: 'achievements',
    type: 'skill_milestone',
    label: 'Skill Milestones',
    description: 'When you reach new skill rating milestones',
    enabled: true,
    channels: { push: true, email: false, inApp: true },
    timing: { immediate: true, digest: true, quietHours: true },
    priority: 'medium'
  },
  {
    id: 'social_activity',
    category: 'social',
    type: 'social_activity',
    label: 'Social Activity',
    description: 'Updates from your connections and friends',
    enabled: false,
    channels: { push: false, email: false, inApp: true },
    timing: { immediate: false, digest: true, quietHours: true },
    priority: 'low'
  },
  {
    id: 'system_updates',
    category: 'system',
    type: 'system_update',
    label: 'System Updates',
    description: 'Important platform updates and maintenance notices',
    enabled: true,
    channels: { push: false, email: true, inApp: true },
    timing: { immediate: false, digest: true, quietHours: false },
    priority: 'medium'
  }
];

const mockGlobalSettings = {
  enabled: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  },
  digest: {
    enabled: true,
    frequency: 'daily' as const,
    time: '09:00'
  },
  channels: {
    push: true,
    email: true,
    inApp: true,
    sms: false
  }
};

export default function PlayerNotificationsPage() {
  const [activeView, setActiveView] = useState<'notifications' | 'preferences'>('notifications');
  const [notifications, setNotifications] = useState<PlayerNotification[]>(mockNotifications);
  const [preferences, setPreferences] = useState<NotificationPreference[]>(mockPreferences);
  const [globalSettings, setGlobalSettings] = useState(mockGlobalSettings);
  const [loading, setLoading] = useState(false);

  // Notification handlers
  const handleNotificationAction = (notificationId: string, actionId: string) => {
    console.log('Notification action:', { notificationId, actionId });
    
    // Mark notification as read when action is taken
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    // Handle specific actions
    switch (actionId) {
      case 'accept_tournament':
        // Handle tournament acceptance
        break;
      case 'decline_tournament':
        // Handle tournament decline
        break;
      case 'accept_connection':
        // Handle connection acceptance
        break;
      case 'decline_connection':
        // Handle connection decline
        break;
      case 'confirm_attendance':
        // Handle match attendance confirmation
        break;
    }
  };

  const handleMarkRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      setNotifications([]);
    }
  };

  // Preference handlers
  const handleUpdatePreference = (preferenceId: string, updates: Partial<NotificationPreference>) => {
    setPreferences(prev => 
      prev.map(p => p.id === preferenceId ? { ...p, ...updates } : p)
    );
  };

  const handleUpdateGlobalSettings = (updates: any) => {
    setGlobalSettings(prev => ({ ...prev, ...updates }));
  };

  const handleTestNotification = (channel: string) => {
    console.log('Testing notification channel:', channel);
    
    // Create a test notification
    const testNotification: PlayerNotification = {
      id: `test_${Date.now()}`,
      type: 'system_update',
      priority: 'low',
      title: `Test ${channel.charAt(0).toUpperCase() + channel.slice(1)} Notification`,
      message: `This is a test notification sent via ${channel}. If you received this, your ${channel} notifications are working correctly!`,
      timestamp: new Date().toISOString(),
      read: false,
      actionable: false,
      category: 'system'
    };
    
    setNotifications(prev => [testNotification, ...prev]);
  };

  const handleSavePreferences = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('Preferences saved:', { preferences, globalSettings });
    }, 1000);
  };

  const handleResetPreferences = () => {
    if (confirm('Are you sure you want to reset all notification preferences to default values?')) {
      setPreferences(mockPreferences);
      setGlobalSettings(mockGlobalSettings);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="h-8 w-8 text-blue-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600">
                  {unreadCount > 0 
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                    : 'You\'re all caught up!'
                  }
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
              <Button
                size="sm"
                variant={activeView === 'notifications' ? 'primary' : 'ghost'}
                onClick={() => setActiveView('notifications')}
              >
                <Bell className="h-4 w-4 mr-1" />
                Notifications
              </Button>
              <Button
                size="sm"
                variant={activeView === 'preferences' ? 'primary' : 'ghost'}
                onClick={() => setActiveView('preferences')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Preferences
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeView === 'notifications' ? (
          <NotificationCenter
            notifications={notifications}
            onAction={handleNotificationAction}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={handleDismiss}
            onClearAll={handleClearAll}
            onUpdatePreferences={() => setActiveView('preferences')}
            loading={loading}
            hasMore={false}
          />
        ) : (
          <NotificationPreferences
            preferences={preferences}
            globalSettings={globalSettings}
            onUpdatePreference={handleUpdatePreference}
            onUpdateGlobalSettings={handleUpdateGlobalSettings}
            onTestNotification={handleTestNotification}
            onSave={handleSavePreferences}
            onReset={handleResetPreferences}
          />
        )}
      </div>
    </div>
  );
}