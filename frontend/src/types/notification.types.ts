/**
 * Notification Types
 */

export interface Notification {
  id: string;
  type: string;
  notification_type?: string; // Alias for type
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  icon?: string;
  data?: Record<string, any>;
  action_url?: string;
  read: boolean; // Changed from is_read for consistency
  is_read?: boolean; // Keep for backward compatibility
  read_at?: string;
  created_at: string;
  expires_at?: string;
  sender?: {
    id: string;
    full_name: string;
    name?: string; // Alias for full_name
    profile_picture?: string;
  };
  tournament?: {
    id: string;
    name: string;
    // Optional date or other metadata may be present from the API
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  enable_push_notifications: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  notify_messages: boolean;
  notify_tournaments: boolean;
  notify_matches: boolean;
  notify_teams: boolean;
  notify_payments: boolean;
  notify_connections: boolean;
  notify_achievements: boolean;
  notify_system: boolean;
  enable_quiet_hours: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  // Optional total count of notifications (for pagination / tabs)
  count?: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// Filters used when querying notifications from the API
export interface NotificationFilters {
  notification_type?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  date_from?: string;
  date_to?: string;
  read?: boolean;
  search?: string;
}
