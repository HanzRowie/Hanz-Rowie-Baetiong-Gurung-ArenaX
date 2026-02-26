/**
 * Notification Service - Real-time notifications via WebSocket and REST API
 */
import { api } from './api';
import toastService from './toastService';
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
  private static instance: NotificationService | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private connectionInProgress = false;
  private hasShownToast = new Set<string>(); // Track which notifications have shown toasts

  private onNotificationCallbacks: Set<(notification: Notification) => void> = new Set();
  private onUnreadCountCallbacks: Set<(count: number) => void> = new Set();
  private onConnectionCallbacks: Set<(connected: boolean) => void> = new Set();

  // Singleton pattern
  constructor() {
    if (NotificationService.instance) {
      return NotificationService.instance;
    }
    NotificationService.instance = this;
  }

  /**
   * Clear all callbacks (useful for cleanup)
   */
  clearCallbacks(): void {
    console.log('[NotificationService] Clearing all callbacks');
    this.onNotificationCallbacks.clear();
    this.onUnreadCountCallbacks.clear();
    this.onConnectionCallbacks.clear();
  }

  /**
   * Connect to notifications WebSocket
   */
  connectToNotifications(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token available for notifications');
      return false;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.connectionInProgress) {
      console.log('[NotificationService] Connection already in progress, skipping...');
      return true;
    }

    // Disconnect existing connection first to prevent duplicates
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket already connected or connecting, skipping...');
        return true;
      }
      // Clean up old connection
      this.disconnect();
    }

    try {
      this.connectionInProgress = true;
      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${token}`;

      console.log('[NotificationService] Connecting to WebSocket...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[NotificationService] Connected to notifications WebSocket');
        this.reconnectAttempts = 0;
        this.connectionInProgress = false;
        this.onConnectionCallbacks.forEach(callback => callback(true));
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
        console.log('[NotificationService] Disconnected from notifications WebSocket');
        this.stopHeartbeat();
        this.connectionInProgress = false;
        this.onConnectionCallbacks.forEach(callback => callback(false));
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[NotificationService] WebSocket error:', error);
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
        
        // Show toast and play sound ONCE in the service
        const notificationId = data.notification.id;
        if (!this.hasShownToast.has(notificationId)) {
          this.hasShownToast.add(notificationId);
          this.showNotificationToast(data.notification);
          this.playNotificationSound();
          
          // Clean up old entries to prevent memory leak (keep last 100)
          if (this.hasShownToast.size > 100) {
            const firstItem = this.hasShownToast.values().next().value;
            this.hasShownToast.delete(firstItem);
          }
        }
        
        // Notify all callbacks
        this.onNotificationCallbacks.forEach(callback => callback(data.notification));
        break;

      case 'unread_count':
        this.onUnreadCountCallbacks.forEach(callback => callback(data.count));
        break;

      case 'marked_read':
        this.onUnreadCountCallbacks.forEach(callback => callback(data.unread_count));
        break;

      case 'marked_all_read':
        this.onUnreadCountCallbacks.forEach(callback => callback(0));
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

  private showNotificationToast(notification: Notification): void {
    const icon = this.getNotificationIcon(notification.type);
    const message = `${icon} ${notification.title}: ${notification.message.substring(0, 80)}${notification.message.length > 80 ? '...' : ''}`;
    toastService.info(message);
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors (e.g., user hasn't interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  private getNotificationIcon(type: string): string {
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
    console.log('[NotificationService] Disconnecting...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      // Remove event listeners to prevent reconnection attempts
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      
      // Only close if connection is open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    console.log('[NotificationService] Disconnected');
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
   * Notify that user is viewing a specific group chat
   */
  setViewingGroupChat(teamId: string): void {
    console.log('[NotificationService] Setting viewing group chat:', teamId);
    
    const sendMessage = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'viewing_group_chat',
          team_id: teamId
        }));
        console.log('[NotificationService] Sent viewing_group_chat message');
      } else {
        console.warn('[NotificationService] WebSocket not open, cannot send viewing_group_chat');
      }
    };
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      sendMessage();
    } else {
      console.log('[NotificationService] Waiting for WebSocket connection to send viewing_group_chat');
      const checkConnection = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          sendMessage();
        }
      }, 100);
      
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
   * Notify that user left group chat view
   */
  setLeftGroupChat(): void {
    console.log('[NotificationService] Setting left group chat');
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'left_group_chat'
      }));
      console.log('[NotificationService] Sent left_group_chat message');
    } else {
      console.warn('[NotificationService] WebSocket not open, cannot send left_group_chat');
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
  onNotification(callback: (notification: Notification) => void): () => void {
    this.onNotificationCallbacks.add(callback);
    // Return cleanup function
    return () => {
      this.onNotificationCallbacks.delete(callback);
    };
  }

  onUnreadCount(callback: (count: number) => void): () => void {
    this.onUnreadCountCallbacks.add(callback);
    // Return cleanup function
    return () => {
      this.onUnreadCountCallbacks.delete(callback);
    };
  }

  onConnection(callback: (connected: boolean) => void): () => void {
    this.onConnectionCallbacks.add(callback);
    // Return cleanup function
    return () => {
      this.onConnectionCallbacks.delete(callback);
    };
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
      // Delete each notification individually since bulk delete endpoint may not exist
      await Promise.all(ids.map(id => this.deleteNotification(id)));
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
