/**
 * Notification Service - Real-time notifications via WebSocket and REST API
 */
import { api } from './api';
import type {  Notification, NotificationPreferences, NotificationsResponse } from '@/types/notification.types';

export interface NotificationFilters {
  read?: boolean;
  type?: string;
  notification_type?: string; // Alias for type
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
}

class NotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;

  private onNotificationCallback?: (notification: Notification) => void;
  private onUnreadCountCallback?: (count: number) => void;
  private onConnectionCallback?: (connected: boolean) => void;

  /**
   * Connect to notifications WebSocket
   */
  connectToNotifications(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token available for notifications');
      return false;
    }

    // Disconnect existing connection
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    try {
      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to notifications WebSocket');
        this.reconnectAttempts = 0;
        this.onConnectionCallback?.(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from notifications WebSocket');
        this.stopHeartbeat();
        this.onConnectionCallback?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to notifications WebSocket:', error);
      return false;
    }
  }

  private handleWebSocketMessage(data: any): void {
    console.log('[NotificationService] Received WebSocket message:', data);
    switch (data.type) {
      case 'notification':
        console.log('[NotificationService] New notification:', data.notification);
        this.onNotificationCallback?.(data.notification);
        break;

      case 'unread_count':
        this.onUnreadCountCallback?.(data.count);
        break;

      case 'marked_read':
        this.onUnreadCountCallback?.(data.unread_count);
        break;

      case 'marked_all_read':
        this.onUnreadCountCallback?.(0);
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('WebSocket error:', data.error);
        break;

      default:
        console.warn('Unknown WebSocket message type:', data.type);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached for notifications');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting to notifications in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connectToNotifications();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Mark notification as read.
   * Uses WebSocket when available, falls back to REST API.
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        notification_id: notificationId
      }));
      return;
    }

    // Fallback to REST when WebSocket is not connected
    await this.markNotificationRead(notificationId);
  }

  /**
   * Mark notification as unread.
   * Uses REST API to persist unread state when supported by the backend.
   */
  async markAsUnread(notificationId: string): Promise<void> {
    await this.markNotificationUnread(notificationId);
  }

  /**
   * Mark all notifications as read.
   * Uses WebSocket when available, falls back to REST API.
   */
  async markAllAsRead(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_all_read'
      }));
      return;
    }

    await this.markAllNotificationsRead();
  }

  /**
   * Notify that user is viewing a specific chat
   */
  setViewingChat(userId: string): void {
    console.log('[NotificationService] Setting viewing chat:', userId);
    
    const sendMessage = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'viewing_chat',
          user_id: userId
        }));
        console.log('[NotificationService] Sent viewing_chat message');
      } else {
        console.warn('[NotificationService] WebSocket not open, cannot send viewing_chat');
      }
    };
    
    // If WebSocket is already open, send immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      sendMessage();
    } else {
      // Otherwise, wait for connection and then send
      console.log('[NotificationService] Waiting for WebSocket connection to send viewing_chat');
      const checkConnection = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          sendMessage();
        }
      }, 100);
      
      // Clear interval after 5 seconds to prevent memory leak
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }

  /**
   * Notify that user left chat view
   */
  setLeftChat(): void {
    console.log('[NotificationService] Setting left chat');
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'left_chat'
      }));
      console.log('[NotificationService] Sent left_chat message');
    } else {
      console.warn('[NotificationService] WebSocket not open, cannot send left_chat');
    }
  }

  /**
   * Get unread count via WebSocket
   */
  requestUnreadCount(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'get_unread_count'
      }));
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Set callback handlers
   */
  onNotification(callback: (notification: Notification) => void): void {
    this.onNotificationCallback = callback;
  }

  onUnreadCount(callback: (count: number) => void): void {
    this.onUnreadCountCallback = callback;
  }

  onConnection(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  // REST API Methods

  /**
   * Get all notifications with optional filters
   */
  async getNotifications(filters?: {
    read?: boolean;
    type?: string;
    priority?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: Notification[];
    unread_count: number;
    count: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.read !== undefined) params.append('read', String(filters.read));
      if (filters?.type) params.append('type', filters.type);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      
      const queryString = params.toString();
      const url = `/api/notifications/notifications/${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      // Ensure we return the expected structure
      return {
        notifications: response.data.results || response.data.notifications || response.data || [],
        unread_count: response.data.unread_count || 0,
        count: response.data.count || response.data.total || (response.data.results?.length || 0)
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty data structure on error instead of throwing
      return {
        notifications: [],
        unread_count: 0,
        count: 0
      };
    }
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(): Promise<NotificationsResponse> {
    try {
      const response = await api.get('/api/notifications/notifications/unread/');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/api/notifications/notifications/unread_count/');
      return response.data.unread_count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read via REST API
   */
  async markNotificationRead(id: string): Promise<void> {
    try {
      await api.post(`/api/notifications/notifications/${id}/mark_read/`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read via REST API
   */
  async markAllNotificationsRead(): Promise<void> {
    try {
      await api.post('/api/notifications/notifications/mark_all_read/');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    try {
      await api.delete(`/api/notifications/notifications/${id}/soft_delete/`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    try {
      await api.post('/api/notifications/notifications/delete_multiple/', { ids });
    } catch (error) {
      console.error('Error deleting multiple notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as unread via REST API
   */
  async markNotificationUnread(id: string): Promise<void> {
    try {
      await api.post(`/api/notifications/notifications/${id}/mark_unread/`);
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    try {
      await api.post('/api/notifications/notifications/mark_multiple_read/', { ids });
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await api.delete('/api/notifications/notifications/clear_all/');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await api.get('/api/notifications/preferences/my_preferences/');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await api.put('/api/notifications/preferences/update_preferences/', preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

// Re-export types for convenience
export type { Notification, NotificationPreferences, NotificationsResponse } from '@/types/notification.types';
