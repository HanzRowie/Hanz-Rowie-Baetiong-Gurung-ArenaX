// Group Chat Service for REST API interactions
import { api } from './api';

export interface GroupMessage {
  id: string;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: string;
  edited: boolean;
  edited_at?: string;
  deleted: boolean;
  deleted_at?: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  reply_to?: string;
}

export interface GroupChat {
  id: string;
  team: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface GroupChatResponse {
  group_chat: GroupChat;
  recent_messages: GroupMessage[];
}

export interface GroupMessagesResponse {
  messages: GroupMessage[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

class GroupChatService {
  // Get group chat for team
  async getGroupChat(teamId: string): Promise<GroupChatResponse> {
    try {
      const response = await api.get<GroupChatResponse>(`/api/chat/groups/${teamId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching group chat:', error);
      throw error;
    }
  }

  // Get group messages with pagination
  async getGroupMessages(
    teamId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<GroupMessagesResponse> {
    try {
      const response = await api.get<GroupMessagesResponse>(
        `/api/chat/groups/${teamId}/messages/?page=${page}&page_size=${pageSize}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching group messages:', error);
      throw error;
    }
  }

  // Send group message
  async sendGroupMessage(
    teamId: string,
    content: string,
    messageType: string = 'TEXT'
  ): Promise<GroupMessage> {
    try {
      const response = await api.post<GroupMessage>(
        `/api/chat/groups/${teamId}/messages/`,
        {
          content,
          message_type: messageType
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  // Mark group messages as read
  async markGroupMessagesRead(teamId: string, messageId: string): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>(
        `/api/chat/groups/${teamId}/mark-read/`,
        { message_id: messageId }
      );
      return response.data;
    } catch (error) {
      console.error('Error marking group messages as read:', error);
      throw error;
    }
  }
}

export const groupChatService = new GroupChatService();
