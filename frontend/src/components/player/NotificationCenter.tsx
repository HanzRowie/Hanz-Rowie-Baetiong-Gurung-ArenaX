import { useState } from 'react';
import {
  Bell,
  Settings,
  CheckCircle,
  Trash2,
  Search,
  X,
  BellOff,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import NotificationCard, { type PlayerNotification } from './NotificationCard';

interface NotificationCenterProps {
  notifications: PlayerNotification[];
  onAction?: (notificationId: string, actionId: string) => void;
  onMarkRead?: (notificationId: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (notificationId: string) => void;
  onClearAll?: () => void;
  onUpdatePreferences?: () => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function NotificationCenter({
  notifications,
  onAction,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
  onUpdatePreferences,
  loading = false,
  hasMore = false,
  onLoadMore
}: NotificationCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = !searchQuery || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || notification.priority === selectedPriority;
    const matchesReadStatus = !showUnreadOnly || !notification.read;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesReadStatus;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, PlayerNotification[]>);

  // Get notification counts
  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length;
  
  // Category counts
  const categoryCounts = notifications.reduce((counts, notification) => {
    counts[notification.category] = (counts[notification.category] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {unreadCount} unread
                </span>
              )}
              {urgentCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1 inline" />
                  {urgentCount} urgent
                </span>
              )}
            </div>
            <p className="text-gray-600">Stay updated with your tournament activities and achievements</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}
            >
              {viewMode === 'list' ? 'Compact View' : 'List View'}
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={onUpdatePreferences}
            >
              <Settings className="h-4 w-4 mr-1" />
              Preferences
            </Button>
            
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onMarkAllRead}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
            <div className="text-sm text-blue-700">Total</div>
          </div>
          
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{unreadCount}</div>
            <div className="text-sm text-emerald-700">Unread</div>
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {notifications.filter(n => n.actionable).length}
            </div>
            <div className="text-sm text-amber-700">Action Required</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {notifications.filter(n => n.type === 'achievement_unlock').length}
            </div>
            <div className="text-sm text-purple-700">Achievements</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <div className="text-sm text-red-700">Urgent</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryCounts).map(([category, count]) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Unread Toggle */}
          <Button
            variant={showUnreadOnly ? 'primary' : 'secondary'}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className="whitespace-nowrap"
          >
            {showUnreadOnly ? <BellOff className="h-4 w-4 mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
            {showUnreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-6">
        {Object.keys(groupedNotifications).length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || showUnreadOnly
                ? 'No notifications match your current filters.'
                : 'You\'re all caught up! New notifications will appear here.'
              }
            </p>
            {(searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || showUnreadOnly) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedPriority('all');
                  setShowUnreadOnly(false);
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </Card>
        ) : (
          Object.entries(groupedNotifications)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([dateString, dayNotifications]) => (
              <div key={dateString} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDateGroup(dateString)}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-500">
                    {dayNotifications.length} notification{dayNotifications.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Notifications */}
                <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}>
                  {dayNotifications
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAction={onAction}
                        onMarkRead={onMarkRead}
                        onDismiss={onDismiss}
                        compact={viewMode === 'compact'}
                      />
                    ))}
                </div>
              </div>
            ))
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="secondary"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Loading...
                </div>
              ) : (
                'Load More Notifications'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {filteredNotifications.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} shown
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onMarkAllRead}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
              
              <Button
                size="sm"
                variant="danger"
                onClick={onClearAll}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}