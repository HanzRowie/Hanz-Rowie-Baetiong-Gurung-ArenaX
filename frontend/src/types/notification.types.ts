export interface Notification {
  id: string;
  notification_type: 'TOURNAMENT_REGISTRATION' | 'MATCH_RESULT' | 'BOOKING_REQUEST' | 'JOIN_REQUEST' | 'SYSTEM' | 'MESSAGE' | 'VENUE_BOOKING';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
  // Related objects
  tournament?: {
    id: string;
    title: string;
    sport_type?: string;
    date?: string;
  };
  match?: {
    id: string;
    tournament_title: string;
    opponent_name?: string;
    scheduled_time?: string;
  };
  booking?: {
    id: string;
    venue_name?: string;
    booking_date?: string;
    start_time?: string;
  };
  referee_booking?: {
    id: string;
    tournament_title: string;
    match_date?: string;
  };
  sender?: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  related_id?: string;
  action_url?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface NotificationPreference {
  id: string;
  user: string;
  notification_type: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface NotificationFilters {
  notification_type?: string;
  read?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface NotificationStats {
  total_count: number;
  unread_count: number;
  read_count: number;
  type_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  recent_activity: Array<{
    date: string;
    count: number;
  }>;
}

export interface NotificationUpdate {
  new_notifications: Notification[];
  updated_notifications: Notification[];
  deleted_notifications: string[];
  unread_count: number;
  last_check: string;
}

export interface NotificationSettings {
  preferences: NotificationPreference[];
  available_types: Array<{
    type: string;
    display_name: string;
    description: string;
    default_settings: {
      email_enabled: boolean;
      push_enabled: boolean;
      in_app_enabled: boolean;
    };
  }>;
}

export interface CreateNotificationData {
  notification_type: string;
  title: string;
  message: string;
  recipient_id?: string;
  related_id?: string;
  action_url?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}