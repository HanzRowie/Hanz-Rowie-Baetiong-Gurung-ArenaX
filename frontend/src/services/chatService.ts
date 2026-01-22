// Chat Service for WebSocket and REST API interactions - Private Messages
import { api } from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { store } from '@/store';

export interface PrivateMessage {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
  is_from_me: boolean;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  receiver?: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

export interface Conversation {
  user: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  latest_message: {
    content: string;
    timestamp: string;
    is_from_me: boolean;
  };
}

export interface ConversationMessagesResponse {
  messages: PrivateMessage[];
  other_user: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

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

  private onPrivateMessageCallback?: (message: PrivateMessage) => void;
  private onMessageCallback?: (message: ChatMessage) => void; // Legacy
  private onErrorCallback?: (error: string) => void;
  private onConnectionCallback?: (connected: boolean) => void;

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
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentConversationId === otherUserId) {
      return true; // Already connected to this conversation
    }

    // Disconnect from previous connection if exists
    this.disconnect();

    this.currentConversationId = otherUserId;
    const token = localStorage.getItem('access_token'); // Use the correct token key
    if (!token) {
      console.error('No access token available for chat connection');
      return false;
    }

    try {
      // Use the WebSocket URL from environment variables
      const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      const wsUrl = `${wsBaseUrl}/ws/chat/${otherUserId}/`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`Connected to private chat WebSocket for user ${otherUserId}`);
        this.onConnectionCallback?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message && !data.error) {
            // Add is_from_me field based on current user
            const currentUser = store.getState().auth.user;
            const message = {
              ...data.message,
              is_from_me: data.message.sender?.id === currentUser?.id
            };
            
            // Handle private message
            this.onPrivateMessageCallback?.(message);
            // Also call legacy callback for backward compatibility
            this.onMessageCallback?.(message);
          } else if (data.error) {
            this.onErrorCallback?.(data.error);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log(`Private chat WebSocket connection closed for user ${otherUserId}`);
        this.onConnectionCallback?.(false);
        // Don't auto-reconnect for private chats
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onErrorCallback?.('WebSocket connection error');
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to private chat WebSocket:', error);
      return false;
    }
  }

  // Legacy global chat connect method
  connect(): boolean {
    return this.connectToPrivateChat('global'); // Use a dummy ID for global chat
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Send a message
  sendMessage(content: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        message: content.trim(),
      }));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
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

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Private Messaging REST API methods

  // Get list of conversations
  async getConversations(): Promise<ConversationsResponse> {
    try {
      const response = await api.get<ConversationsResponse>(API_ENDPOINTS.CHAT.CONVERSATIONS);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
      return response.data.message_data;
    } catch (error) {
      console.error('Error sending private message:', error);
      throw error;
    }
  }

  // Set private message callback
  onPrivateMessage(callback: (message: PrivateMessage) => void): void {
    this.onPrivateMessageCallback = callback;
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
      const response = await api.post(`/api/conversations/${otherUserId}/mark-read`);
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
