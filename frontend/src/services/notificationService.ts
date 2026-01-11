import api from './api';

export interface Notification {
  id: string;
  notification_type: 'TOURNAMENT_REGISTRATION' | 'MATCH_RESULT' | 'BOOKING_REQUEST' | 'JOIN_REQUEST' | 'SYSTEM' | 'MESSAGE';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
  // Related objects
  tournament?: {
    id: string;
    title: string;
  };
  match?: {
    id: string;
    tournament_title: string;
  };
  booking?: {
    id: string;
    venue_name: string;
  };
  sender?: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  related_id?: string;
  action_url?: string;
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
}

class NotificationService {
  // Fetch and manage notifications
  async getNotifications(filters?: NotificationFilters): Promise<{ 
    notifications: Notification[]; 
    count: number;
    unread_count: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters?.notification_type) params.append('type', filters.notification_type);
    if (filters?.read !== undefined) params.append('read', filters.read.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/notifications/?${params.toString()}`);
    return response.data;
  }

  async getNotificationDetail(notificationId: string): Promise<{ notification: Notification }> {
    const response = await api.get(`/notifications/${notificationId}`);
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<{ notification: Notification; message: string }> {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAsUnread(notificationId: string): Promise<{ notification: Notification; message: string }> {
    const response = await api.post(`/notifications/${notificationId}/unread`);
    return response.data;
  }

  async markAllAsRead(): Promise<{ updated_count: number; message: string }> {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async deleteAllRead(): Promise<{ deleted_count: number; message: string }> {
    const response = await api.delete('/notifications/delete-read');
    return response.data;
  }

  // Notification filtering and search
  async searchNotifications(query: string, filters?: NotificationFilters): Promise<{ 
    notifications: Notification[]; 
    count: number;
  }> {
    const searchFilters = { ...filters, search: query };
    const result = await this.getNotifications(searchFilters);
    return {
      notifications: result.notifications,
      count: result.count
    };
  }

  async getNotificationsByType(type: string): Promise<{ notifications: Notification[]; count: number }> {
    const result = await this.getNotifications({ notification_type: type });
    return {
      notifications: result.notifications,
      count: result.count
    };
  }

  async getUnreadNotifications(): Promise<{ notifications: Notification[]; count: number }> {
    const result = await this.getNotifications({ read: false });
    return {
      notifications: result.notifications,
      count: result.count
    };
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const response = await api.get('/notifications/stats');
    return response.data;
  }

  // Real-time notification updates
  async getLatestNotifications(since?: string): Promise<{ 
    notifications: Notification[]; 
    count: number;
    has_new: boolean;
  }> {
    const params = since ? `?since=${since}` : '';
    const response = await api.get(`/notifications/latest${params}`);
    return response.data;
  }

  async pollForUpdates(lastCheck?: string): Promise<{
    new_notifications: Notification[];
    updated_notifications: Notification[];
    deleted_notifications: string[];
    unread_count: number;
  }> {
    const params = lastCheck ? `?last_check=${lastCheck}` : '';
    const response = await api.get(`/notifications/poll${params}`);
    return response.data;
  }

  // Notification preferences management
  async getNotificationPreferences(): Promise<{ preferences: NotificationPreference[] }> {
    const response = await api.get('/notification-preferences');
    return response.data;
  }

  async updateNotificationPreference(
    preferenceId: string, 
    data: Partial<Omit<NotificationPreference, 'id' | 'user' | 'created_at' | 'updated_at'>>
  ): Promise<{ preference: NotificationPreference; message: string }> {
    const response = await api.put(`/notification-preferences/${preferenceId}`, data);
    return response.data;
  }

  async updateAllPreferences(
    preferences: Record<string, { email_enabled: boolean; push_enabled: boolean; in_app_enabled: boolean }>
  ): Promise<{ preferences: NotificationPreference[]; message: string }> {
    const response = await api.put('/notification-preferences/bulk', { preferences });
    return response.data;
  }

  async resetPreferencesToDefault(): Promise<{ preferences: NotificationPreference[]; message: string }> {
    const response = await api.post('/notification-preferences/reset');
    return response.data;
  }

  // Utility methods for real-time updates
  private eventSource?: EventSource;

  startRealTimeUpdates(onNotification: (notification: Notification) => void): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Get auth token for SSE connection
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No auth token available for real-time notifications');
      return;
    }

    this.eventSource = new EventSource(`${api.defaults.baseURL}/notifications/stream?token=${token}`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        onNotification(notification);
      } catch (error) {
        console.error('Error parsing notification event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.startRealTimeUpdates(onNotification);
        }
      }, 5000);
    };
  }

  stopRealTimeUpdates(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  // Batch operations
  async markMultipleAsRead(notificationIds: string[]): Promise<{ updated_count: number; message: string }> {
    const response = await api.post('/notifications/batch-read', { notification_ids: notificationIds });
    return response.data;
  }

  async deleteMultiple(notificationIds: string[]): Promise<{ deleted_count: number; message: string }> {
    const response = await api.post('/notifications/batch-delete', { notification_ids: notificationIds });
    return response.data;
  }

  // Create notification (for testing or admin purposes)
  async createNotification(data: {
    notification_type: string;
    title: string;
    message: string;
    recipient_id?: string;
    related_id?: string;
    action_url?: string;
  }): Promise<{ notification: Notification; message: string }> {
    const response = await api.post('/notifications/create', data);
    return response.data;
  }
}

export const notificationService = new NotificationService();