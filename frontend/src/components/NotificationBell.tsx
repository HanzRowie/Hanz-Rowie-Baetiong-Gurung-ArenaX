import { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notification.types';
import toastService from '@/services/toastService';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[NotificationBell] Component mounting, setting up callbacks');
    
    // DON'T clear callbacks - let the cleanup functions handle removal
    // This prevents HMR from breaking active callbacks
    
    // Connect to WebSocket
    notificationService.connectToNotifications();

    // Set up callbacks and store cleanup functions
    const cleanupNotification = notificationService.onNotification((notification) => {
      console.log('[NotificationBell] Received notification:', notification.id);
      console.log('[NotificationBell] Current notifications count before update');
      
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {
          console.log('[NotificationBell] Notification already exists, skipping');
          return prev;
        }
        const newNotifications = [notification, ...prev].slice(0, 20);
        console.log('[NotificationBell] Updated notifications, new count:', newNotifications.length);
        return newNotifications;
      });
      
      // Increment unread count for new notification
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('[NotificationBell] Unread count:', prev, '→', newCount);
        return newCount;
      });
      
      // Toast and sound are now handled in notificationService
    });

    const cleanupUnreadCount = notificationService.onUnreadCount((count) => {
      console.log('[NotificationBell] Unread count updated:', count);
      setUnreadCount(count);
    });

    // Load initial notifications
    loadNotifications();

    return () => {
      console.log('[NotificationBell] Component unmounting, cleaning up callbacks');
      // Cleanup this component's callbacks
      cleanupNotification();
      cleanupUnreadCount();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUnreadNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string): string => {
    // Use the same icon map from the service for consistency
    const iconMap: Record<string, string> = {
      'NEW_MESSAGE': '💬',
      'MESSAGE_REPLY': '💬',
      'TOURNAMENT_STARTING_SOON': '🏆',
      'TOURNAMENT_REGISTRATION_OPEN': '🏆',
      'TOURNAMENT_REGISTRATION_CLOSING': '⏰',
      'TOURNAMENT_CANCELLED': '❌',
      'TOURNAMENT_RESCHEDULED': '📅',
      'TOURNAMENT_RESULT': '🏅',
      'TOURNAMENT_BRACKET_UPDATE': '🌳',
      'MATCH_STARTING_SOON': '▶️',
      'MATCH_RESULT': '✅',
      'MATCH_RESCHEDULED': '📅',
      'MATCH_CANCELLED': '❌',
      'TEAM_INVITATION': '👥',
      'TEAM_INVITATION_ACCEPTED': '✅',
      'TEAM_INVITATION_REJECTED': '❌',
      'TEAM_MEMBER_LEFT': '👋',
      'TEAM_MEMBER_REMOVED': '🚫',
      'PAYMENT_SUCCESS': '✅',
      'PAYMENT_FAILED': '❌',
      'PAYMENT_REFUND': '💰',
      'PAYMENT_PENDING': '⏳',
      'CONNECTION_REQUEST': '🤝',
      'CONNECTION_ACCEPTED': '✅',
      'CONNECTION_REJECTED': '❌',
      'ACHIEVEMENT_UNLOCKED': '🏅',
      'LEVEL_UP': '📈',
      'MILESTONE_REACHED': '🎯',
      'SYSTEM_ANNOUNCEMENT': '📢',
      'MAINTENANCE_SCHEDULED': '🔧',
      'ACCOUNT_UPDATE': '👤',
      'REFEREE_ASSIGNED': '👨‍⚖️',
      'GENERAL': '🔔',
    };
    return iconMap[type] || '🔔';
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await notificationService.markNotificationRead(notification.id);
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
      setShowDropdown(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toastService.success('All notifications marked as read');
    } catch (error) {
      toastService.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toastService.success('Notification deleted');
    } catch (error) {
      toastService.error('Failed to delete notification');
    }
  };

  const getPriorityColor = (priority: string): string => {
    const colorMap: Record<string, string> = {
      'LOW': 'text-gray-500',
      'MEDIUM': 'text-blue-500',
      'HIGH': 'text-orange-500',
      'URGENT': 'text-red-500',
    };
    return colorMap[priority] || 'text-gray-500';
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const newState = !showDropdown;
          console.log('[NotificationBell] Toggling dropdown:', showDropdown, '→', newState);
          console.log('[NotificationBell] Current notifications in state:', notifications.length);
          console.log('[NotificationBell] Notifications:', notifications.map(n => n.id));
          
          // Reload notifications when opening dropdown to ensure we have latest data
          if (newState) {
            console.log('[NotificationBell] Reloading notifications on dropdown open');
            loadNotifications();
          }
          
          setShowDropdown(newState);
        }}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100">
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2 py-1 hover:bg-purple-200 rounded transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 hover:bg-purple-200 rounded transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1" key={`notifications-${notifications.length}-${unreadCount}`}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">We'll notify you when something happens</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                        !notification.is_read ? 'bg-purple-50 hover:bg-purple-100' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <span className="text-2xl flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </span>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium text-gray-900 ${
                              !notification.is_read ? 'font-semibold' : ''
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1.5"></div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                            <span className={`text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setShowDropdown(false);
                  }}
                  className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium py-2 hover:bg-purple-100 rounded transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
