// Chat Service for WebSocket and REST API interactions - Private Messages
import { api } from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { store } from '@/store';
import type { 
  Message as PrivateMessage,
  Conversation,
  ConversationListResponse as ConversationsResponse,
  MessageListResponse as ConversationMessagesResponse,
  UserPresence,
  MessageStatus,
  UserRole
} from '@/types/chat.types';

// Re-export types for backward compatibility
export type { PrivateMessage, Conversation, ConversationsResponse, ConversationMessagesResponse, UserPresence };

// Legacy interface for backward compatibility
export interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  sender_username: string;
  content: string;
  timestamp: string;
}


export interface ChatApiResponse {
  messages: ChatMessage[];
}

class ChatService {
  private ws: WebSocket | null = null;
  private currentConversationId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  private onPrivateMessageCallback?: (message: PrivateMessage) => void;
  private onMessageCallback?: (message: ChatMessage) => void; // Legacy
  private onErrorCallback?: (error: string) => void;
  private onConnectionCallback?: (connected: boolean) => void;
  private onTypingCallback?: (userId: string, userName: string, isTyping: boolean) => void;
  private onPresenceCallback?: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  private onStatusUpdateCallback?: (messageId: string, status: string) => void;

  // Get recent chat messages via REST API
  async getChatMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const response = await api.get<ChatApiResponse>(`/chat/messages/?limit=${limit}&offset=${offset}`);
      return response.data.messages;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  // Connect to private chat WebSocket for specific conversation
  connectToPrivateChat(otherUserId: string): boolean {
    if (this.ws && this.currentConversationId === otherUserId) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        return true; // Already connected or connecting to this conversation
      }
    }

    // Disconnect from previous connection if exists
    this.disconnect();

    this.currentConversationId = otherUserId;
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token available for chat connection');
      return false;
    }

    try {
      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      // Use the new DirectChatConsumer endpoint that supports all roles
      const wsUrl = `${wsBaseUrl}/ws/chat/direct/?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`Connected to direct chat WebSocket (cross-role support enabled)`);
        this.reconnectAttempts = 0;
        this.onConnectionCallback?.(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log(`Direct chat WebSocket connection closed`);
        this.stopHeartbeat();
        this.onConnectionCallback?.(false);
        this.attemptReconnect(otherUserId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onErrorCallback?.('WebSocket connection error');
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to direct chat WebSocket:', error);
      return false;
    }
  }

  private handleWebSocketMessage(data: any): void {
    const currentUser = store.getState().auth.user;

    switch (data.type) {
      case 'message':
        // New message received from another user
        if (data.message) {
          const message = {
            ...data.message,
            is_from_me: data.message.sender?.id === currentUser?.id
          };
          this.onPrivateMessageCallback?.(message);
          this.onMessageCallback?.(message);

          // Auto-mark as delivered if not from me
          if (!message.is_from_me) {
            this.markMessageDelivered(message.id);
          }
        }
        break;

      case 'message_sent':
        // Confirmation that our message was sent successfully
        if (data.message) {
          const message = {
            ...data.message,
            is_from_me: true
          };
          this.onPrivateMessageCallback?.(message);
          this.onMessageCallback?.(message);
        }
        break;

      case 'typing':
        // User is typing - handle both is_typing true and false
        if (data.user_id !== currentUser?.id) {
          const isTyping = data.is_typing !== false; // Default to true if not specified
          this.onTypingCallback?.(data.user_id, data.user_name || '', isTyping);
        }
        break;

      case 'stop_typing':
        // User stopped typing (legacy support)
        if (data.user_id !== currentUser?.id) {
          this.onTypingCallback?.(data.user_id, '', false);
        }
        break;

      case 'delivery_receipt':
        // Message was delivered to recipient
        if (data.message_id) {
          this.onStatusUpdateCallback?.(data.message_id, 'DELIVERED');
        }
        break;

      case 'read_receipt':
        // Message was read by recipient
        if (data.message_id) {
          this.onStatusUpdateCallback?.(data.message_id, 'READ');
        }
        break;

      case 'status_update':
        // Message status changed (legacy support)
        this.onStatusUpdateCallback?.(data.message_id, data.status);
        break;

      case 'presence':
        // User presence changed
        this.onPresenceCallback?.(data.user_id, data.is_online, data.last_seen);
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        this.onErrorCallback?.(data.error);
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

  private attemptReconnect(otherUserId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connectToPrivateChat(otherUserId);
    }, delay);
  }

  // Legacy global chat connect method
  connect(): boolean {
    return this.connectToPrivateChat('global'); // Use a dummy ID for global chat
  }

  // Disconnect from WebSocket
  disconnect(): void {
    // Send stop typing indicator before disconnecting
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentConversationId) {
      try {
        this.ws.send(JSON.stringify({ 
          type: 'typing',
          receiver_id: this.currentConversationId,
          is_typing: false
        }));
      } catch (error) {
        console.error('Error sending stop typing on disconnect:', error);
      }
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    this.currentConversationId = null;
  }

  // Send a message
  sendMessage(content: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    if (!this.currentConversationId) {
      console.error('No conversation ID set');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        receiver_id: this.currentConversationId,
        content: content.trim(),
        message_type: 'TEXT'
      }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // Send typing indicator
  sendTyping(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentConversationId) {
      // Debounce typing indicator
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      this.ws.send(JSON.stringify({ 
        type: 'typing',
        receiver_id: this.currentConversationId,
        is_typing: true
      }));

      // Auto-stop typing after 3 seconds
      this.typingTimeout = setTimeout(() => {
        this.sendStopTyping();
      }, 3000);
    }
  }

  // Send stop typing indicator
  sendStopTyping(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentConversationId) {
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
      this.ws.send(JSON.stringify({ 
        type: 'typing',
        receiver_id: this.currentConversationId,
        is_typing: false
      }));
    }
  }

  // Mark message as delivered
  markMessageDelivered(messageId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_delivered',
        message_id: messageId
      }));
    }
  }

  // Mark message as read
  markMessageRead(messageId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        message_id: messageId
      }));
    }
  }

  // Mark multiple messages as read (when opening conversation)
  markMessagesAsRead(messageIds: string[]): void {
    messageIds.forEach(id => this.markMessageRead(id));
  }

  // Set callback handlers
  onMessage(callback: (message: ChatMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onConnection(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  // Set private message callback
  onPrivateMessage(callback: (message: PrivateMessage) => void): void {
    this.onPrivateMessageCallback = callback;
  }

  // Set typing indicator callback
  onTyping(callback: (userId: string, userName: string, isTyping: boolean) => void): void {
    this.onTypingCallback = callback;
  }

  // Set presence callback
  onPresence(callback: (userId: string, isOnline: boolean, lastSeen?: string) => void): void {
    this.onPresenceCallback = callback;
  }

  // Set status update callback
  onStatusUpdate(callback: (messageId: string, status: string) => void): void {
    this.onStatusUpdateCallback = callback;
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Private Messaging REST API methods

  // Get list of conversations with optional role filter
  async getConversations(roleFilter?: string): Promise<ConversationsResponse> {
    try {
      const url = roleFilter 
        ? `${API_ENDPOINTS.CHAT.CONVERSATIONS}?role_filter=${roleFilter}`
        : API_ENDPOINTS.CHAT.CONVERSATIONS;
      const response = await api.get<ConversationsResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // Get conversation with specific user
  async getConversation(userId: string): Promise<ConversationMessagesResponse> {
    try {
      const response = await api.get<ConversationMessagesResponse>(`/api/chat/conversations/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  // Create new conversation
  async createConversation(recipientId: string): Promise<{ conversation: any }> {
    try {
      const response = await api.post('/api/chat/conversations/', { recipient_id: recipientId });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Delete conversation
  async deleteConversationNew(userId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/chat/conversations/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Get messages with pagination
  async getMessages(otherUserId: string, page: number = 1, pageSize: number = 50): Promise<{
    messages: PrivateMessage[];
    total: number;
    has_more: boolean;
  }> {
    try {
      const response = await api.get(`/api/chat/messages/?other_user_id=${otherUserId}&page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Send message via REST API
  async sendMessageREST(receiverId: string, content: string, messageType: string = 'TEXT'): Promise<PrivateMessage> {
    try {
      const response = await api.post('/api/chat/messages/', {
        receiver_id: receiverId,
        content,
        message_type: messageType
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, content: string): Promise<PrivateMessage> {
    try {
      const response = await api.patch(`/api/chat/messages/${messageId}/`, { content });
      return response.data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/chat/messages/${messageId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Get messages for a specific conversation
  async getMessagesForConversation(otherUserId: string): Promise<ConversationMessagesResponse> {
    try {
      const response = await api.get<ConversationMessagesResponse>(API_ENDPOINTS.CHAT.MESSAGES(otherUserId));
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  }

  // Send a private message via REST API (fallback when WebSocket not available)
  async sendPrivateMessage(otherUserId: string, content: string): Promise<PrivateMessage> {
    try {
      const responseData = {
        receiver_id: otherUserId,
        content: content,
      };
      const response = await api.post(API_ENDPOINTS.CHAT.SEND, responseData);
      return response.data.message;
    } catch (error) {
      console.error('Error sending private message:', error);
      throw error;
    }
  }

  // Enhanced conversation search and management
  async searchConversations(query: string): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    try {
      const response = await api.get(`/api/conversations/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  async searchMessages(query: string, conversationId?: string): Promise<{
    messages: PrivateMessage[];
    total: number;
    conversations_found: number;
  }> {
    try {
      const params = new URLSearchParams({ q: query });
      if (conversationId) params.append('conversation_id', conversationId);

      const response = await api.get(`/api/messages/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async getConversationHistory(otherUserId: string, limit: number = 50, offset: number = 0): Promise<{
    messages: PrivateMessage[];
    total: number;
    has_more: boolean;
  }> {
    try {
      const response = await api.get(
        `/api/conversations/${otherUserId}/history?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  }

  async markConversationAsRead(otherUserId: string): Promise<{ message: string; unread_count: number }> {
    try {
      const response = await api.post(`/api/chat/conversations/${otherUserId}/mark-read/`);
      return response.data;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  async deleteConversation(otherUserId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/conversations/${otherUserId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async archiveConversation(otherUserId: string): Promise<{ message: string }> {
    try {
      const response = await api.post(`/api/conversations/${otherUserId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  async unarchiveConversation(otherUserId: string): Promise<{ message: string }> {
    try {
      const response = await api.post(`/api/conversations/${otherUserId}/unarchive`);
      return response.data;
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      throw error;
    }
  }

  async getArchivedConversations(): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    try {
      const response = await api.get('/api/conversations/archived');
      return response.data;
    } catch (error) {
      console.error('Error fetching archived conversations:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<{ unread_count: number; unread_conversations: number }> {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT.UNREAD_COUNT);
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Phase 2: Real-Time Features API Methods

  // Get user presence
  async getUserPresence(userId: string): Promise<UserPresence> {
    try {
      const response = await api.get(`/api/chat/presence/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user presence:', error);
      throw error;
    }
  }

  // Get multiple user presences
  async getMultiplePresence(userIds: string[]): Promise<{ presences: UserPresence[] }> {
    try {
      const response = await api.get(`/api/chat/presence/?user_ids=${userIds.join(',')}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching multiple presences:', error);
      throw error;
    }
  }

  // Bulk mark messages as delivered
  async bulkMarkDelivered(messageIds: string[]): Promise<{ updated_count: number }> {
    try {
      const response = await api.post('/api/chat/messages/bulk-mark-delivered/', { message_ids: messageIds });
      return response.data;
    } catch (error) {
      console.error('Error bulk marking delivered:', error);
      throw error;
    }
  }

  // Bulk mark messages as read
  async bulkMarkRead(messageIds: string[]): Promise<{ updated_count: number }> {
    try {
      const response = await api.post('/api/chat/messages/bulk-mark-read/', { message_ids: messageIds });
      return response.data;
    } catch (error) {
      console.error('Error bulk marking read:', error);
      throw error;
    }
  }

  // Get message status
  async getMessageStatus(messageId: string): Promise<{
    message_id: string;
    status: string;
    delivered_at?: string;
    read_at?: string;
  }> {
    try {
      const response = await api.get(`/api/chat/messages/${messageId}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching message status:', error);
      throw error;
    }
  }

  async blockUser(userId: string): Promise<{ message: string }> {
    try {
      const response = await api.post(`/api/accounts/users/${userId}/block/`);
      return response.data;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(userId: string): Promise<{ message: string }> {
    try {
      const response = await api.post(`/api/accounts/users/${userId}/unblock/`);
      return response.data;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  async getBlockedUsers(): Promise<{
    blocked_users: Array<{
      id: string;
      full_name: string;
      profile_picture?: string;
      blocked_at: string;
    }>;
    total: number;
  }> {
    try {
      const response = await api.get('/api/accounts/users/blocked/');
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
