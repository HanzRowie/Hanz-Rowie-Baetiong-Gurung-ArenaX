import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Bell, Filter, Search, Check, CheckCheck, 
  Trash2, Settings, AlertCircle,
  Trophy, Users, MapPin, MessageSquare, UserPlus, 
  X, MoreVertical,
  Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { notificationService, type Notification, type NotificationFilters } from '@/services/notificationService';
import toastService from '@/services/toastService';
import { BottomNavigation } from '@/components';
import NotificationPreferences from '@/components/NotificationPreferences';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [view, setView] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time notification updates
    notificationService.startRealTimeUpdates((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setTotalCount(prev => prev + 1);
    });

    return () => {
      notificationService.stopRealTimeUpdates();
    };
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [filters, view]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const currentFilters = {
        ...filters,
        read: view === 'all' ? undefined : view === 'read',
        search: searchQuery || undefined
      };
      
      const response = await notificationService.getNotifications(currentFilters);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
      setTotalCount(response.count);
    } catch (error) {
      toastService.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      setRefreshing(true);
      await loadNotifications();
      toastService.success('Notifications refreshed');
    } catch (error) {
      toastService.error('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toastService.error('Failed to mark as read');
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      await notificationService.markAsUnread(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      toastService.error('Failed to mark as unread');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toastService.success('All notifications marked as read');
    } catch (error) {
      toastService.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalCount(prev => prev - 1);
      toastService.success('Notification deleted');
    } catch (error) {
      toastService.error('Failed to delete notification');
    }
  };

  const deleteSelected = async () => {
    if (selectedNotifications.size === 0) return;
    
    if (!confirm(`Delete ${selectedNotifications.size} selected notifications?`)) {
      return;
    }

    try {
      await notificationService.deleteMultiple(Array.from(selectedNotifications));
      setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
      setTotalCount(prev => prev - selectedNotifications.size);
      setSelectedNotifications(new Set());
      toastService.success(`${selectedNotifications.size} notifications deleted`);
    } catch (error) {
      toastService.error('Failed to delete notifications');
    }
  };

  const markSelectedAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      await notificationService.markMultipleAsRead(Array.from(selectedNotifications));
      setNotifications(prev => 
        prev.map(n => selectedNotifications.has(n.id) ? { ...n, read: true } : n)
      );
      const unreadSelected = notifications.filter(n => 
        selectedNotifications.has(n.id) && !n.read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadSelected));
      setSelectedNotifications(new Set());
      toastService.success(`${selectedNotifications.size} notifications marked as read`);
    } catch (error) {
      toastService.error('Failed to mark notifications as read');
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedNotifications(new Set(notifications.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TOURNAMENT_REGISTRATION':
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 'MATCH_RESULT':
        return <Trophy className="h-5 w-5 text-green-600" />;
      case 'BOOKING_REQUEST':
      case 'VENUE_BOOKING':
        return <MapPin className="h-5 w-5 text-blue-600" />;
      case 'JOIN_REQUEST':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'MESSAGE':
        return <MessageSquare className="h-5 w-5 text-indigo-600" />;
      case 'SYSTEM':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-l-red-500 bg-red-50';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-50';
      case 'MEDIUM':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(false)}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Notification Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
        <select
          value={filters.notification_type || ''}
          onChange={(e) => setFilters(prev => ({ 
            ...prev, 
            notification_type: e.target.value || undefined 
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="TOURNAMENT_REGISTRATION">Tournament</option>
          <option value="MATCH_RESULT">Match Results</option>
          <option value="BOOKING_REQUEST">Bookings</option>
          <option value="JOIN_REQUEST">Join Requests</option>
          <option value="MESSAGE">Messages</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {/* Priority Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
        <select
          value={filters.priority || ''}
          onChange={(e) => setFilters(prev => ({ 
            ...prev, 
            priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' || undefined 
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              date_from: e.target.value || undefined 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              date_to: e.target.value || undefined 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilters({})}
          className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Clear Filters
        </button>
        <button
          onClick={() => setShowFilters(false)}
          className="flex-1 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Apply
        </button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refreshNotifications}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Refresh notifications"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Filter notifications"
            >
              <Filter className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Notification preferences"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadNotifications()}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-4">
            <FilterPanel />
          </div>
        )}

        {/* View Tabs */}
        <div className="px-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('all')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'all'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setView('unread')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'unread'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setView('read')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'read'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Read ({totalCount - unreadCount})
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="px-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">
                  {selectedNotifications.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markSelectedAsRead}
                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded-full hover:bg-purple-700"
                  >
                    Mark Read
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 text-xs border border-purple-300 text-purple-700 rounded-full hover:bg-purple-100"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {unreadCount > 0 && selectedNotifications.size === 0 && (
          <div className="px-4">
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </button>
              <button
                onClick={selectAll}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Check className="h-4 w-4" />
                Select All
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <main className="px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {view === 'unread' ? 'No unread notifications' : 
                 view === 'read' ? 'No read notifications' : 
                 'No notifications yet'}
              </h3>
              <p className="text-sm text-center">
                {view === 'all' 
                  ? "You'll see notifications about tournaments, matches, and messages here"
                  : `Switch to another view to see ${view === 'unread' ? 'read' : 'unread'} notifications`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 rounded-lg shadow-sm transition-all ${
                    getPriorityColor((notification as any).priority)
                  } ${
                    selectedNotifications.has(notification.id) 
                      ? 'ring-2 ring-purple-500 ring-opacity-50' 
                      : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />

                      {/* Notification Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              notification.read ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              notification.read ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {/* Related Information */}
                            {notification.tournament && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <Trophy className="h-3 w-3" />
                                <span>{notification.tournament.title}</span>
                                {(notification.tournament as any).date && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date((notification.tournament as any).date).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {notification.sender && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <Users className="h-3 w-3" />
                                <span>From {notification.sender.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Timestamp and Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                            )}

                            {/* Action Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle action menu for this notification
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => notification.read ? markAsUnread(notification.id) : markAsRead(notification.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50"
                          >
                            {notification.read ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {notification.read ? 'Mark Unread' : 'Mark Read'}
                          </button>
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 border border-red-300 rounded-full hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                          
                          {notification.action_url && (
                            <button
                              onClick={() => {
                                // Navigate to action URL
                                window.location.href = notification.action_url!;
                              }}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 text-white rounded-full hover:bg-purple-700"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Notification Preferences Modal */}
      <NotificationPreferences 
        isOpen={showPreferences} 
        onClose={() => setShowPreferences(false)} 
      />

      <BottomNavigation />
    </div>
  );
}