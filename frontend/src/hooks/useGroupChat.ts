import { useState, useEffect, useCallback, useRef } from 'react';
import { groupChatService } from '@/services/groupChatService';
import type { GroupMessage } from '@/services/groupChatService';
import { websocketService } from '@/services/websocketService';
import type { WebSocketHandlers } from '@/types/chat.types';

interface UseGroupChatReturn {
  messages: GroupMessage[];
  loadMessages: (teamId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
}

export function useGroupChat(teamId: string): UseGroupChatReturn {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsUrlRef = useRef<string | null>(null);

  // Load group messages
  const loadMessages = useCallback(async (tid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await groupChatService.getGroupMessages(tid);
      setMessages(response.messages);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load group messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send group message
  const sendMessage = useCallback(async (content: string) => {
    if (!wsUrlRef.current) {
      throw new Error('WebSocket not connected');
    }

    try {
      // Send via WebSocket if connected
      if (isConnected) {
        websocketService.send(wsUrlRef.current, {
          type: 'group_message',
          content: content.trim(),
          message_type: 'TEXT'
        });
      } else {
        // Fallback to REST API
        const message = await groupChatService.sendGroupMessage(teamId, content, 'TEXT');
        setMessages(prev => [...prev, message]);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to send group message:', err);
      throw err;
    }
  }, [teamId, isConnected]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await groupChatService.markGroupMessagesRead(teamId, messageId);
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [teamId]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!teamId) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token available for group chat connection');
      return;
    }

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${wsBaseUrl}/ws/chat/group/${teamId}/?token=${token}`;
    wsUrlRef.current = wsUrl;

    const handlers: WebSocketHandlers = {
      onOpen: () => {
        setIsConnected(true);
        console.log(`Connected to group chat for team ${teamId}`);
      },
      onClose: () => {
        setIsConnected(false);
        console.log(`Disconnected from group chat for team ${teamId}`);
      },
      onMessage: (data) => {
        if (data.type === 'group_message' && data.message) {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'user_joined') {
          console.log(`User ${data.user_name} joined the chat`);
        } else if (data.type === 'user_left') {
          console.log(`User left the chat`);
        }
      },
      onError: (err) => {
        console.error('Group chat WebSocket error:', err);
        setError(new Error('WebSocket connection error'));
      }
    };

    websocketService.connect(wsUrl, handlers);

    // Load initial messages
    loadMessages(teamId);

    // Cleanup on unmount
    return () => {
      if (wsUrlRef.current) {
        websocketService.disconnect(wsUrlRef.current);
      }
    };
  }, [teamId, loadMessages]);

  return {
    messages,
    loadMessages,
    sendMessage,
    markAsRead,
    isLoading,
    error,
    isConnected
  };
}
