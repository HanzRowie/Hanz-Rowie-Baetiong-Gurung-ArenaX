import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, Conversation, PrivateMessage, ConversationsResponse } from '@/services/chatService';
import { websocketService, WebSocketHandlers } from '@/services/websocketService';

interface UseChatReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: PrivateMessage[];
  sendMessage: (content: string) => Promise<void>;
  loadConversations: (roleFilter?: string) => Promise<void>;
  loadConversation: (userId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
}

export function useChat(roleFilter?: string): UseChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const activeUserIdRef = useRef<string | null>(null);
  const wsUrlRef = useRef<string | null>(null);

  // Load conversations with optional role filter
  const loadConversations = useCallback(async (filter?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response: ConversationsResponse = await chatService.getConversations(filter || roleFilter);
      setConversations(response.conversations);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter]);

  // Load conversation with specific user
  const loadConversation = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatService.getConversation(userId);
      setMessages(response.messages);
      
      // Find and set active conversation
      const conv = conversations.find(c => c.user.id === userId);
      if (conv) {
        setActiveConversation(conv);
      } else {
        // Create conversation object from response
        setActiveConversation({
          user: response.other_user,
          latest_message: response.messages[response.messages.length - 1] || {
            id: '',
            content: '',
            timestamp: new Date().toISOString(),
            is_from_me: false
          },
          unread_count: 0
        });
      }

      activeUserIdRef.current = userId;

      // Connect to WebSocket for real-time updates
      const token = localStorage.getItem('access_token');
      if (token) {
        const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        const wsUrl = `${wsBaseUrl}/ws/chat/${userId}/?token=${token}`;
        wsUrlRef.current = wsUrl;

        const handlers: WebSocketHandlers = {
          onOpen: () => setIsConnected(true),
          onClose: () => setIsConnected(false),
          onMessage: (data) => {
            if (data.type === 'message' && data.message) {
              setMessages(prev => [...prev, data.message]);
              
              // Update conversation list
              setConversations(prev => {
                const updated = prev.map(c => {
                  if (c.user.id === userId) {
                    return {
                      ...c,
                      latest_message: {
                        id: data.message.id,
                        content: data.message.content,
                        timestamp: data.message.timestamp,
                        is_from_me: data.message.is_from_me
                      }
                    };
                  }
                  return c;
                });
                // Sort by most recent
                return updated.sort((a, b) => 
                  new Date(b.latest_message.timestamp).getTime() - 
                  new Date(a.latest_message.timestamp).getTime()
                );
              });
            }
          },
          onError: (err) => {
            console.error('WebSocket error:', err);
            setError(new Error('WebSocket connection error'));
          }
        };

        websocketService.connect(wsUrl, handlers);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversations]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeUserIdRef.current || !wsUrlRef.current) {
      throw new Error('No active conversation');
    }

    try {
      // Send via WebSocket if connected
      if (isConnected) {
        websocketService.send(wsUrlRef.current, {
          type: 'message',
          message: content.trim()
        });
      } else {
        // Fallback to REST API
        const message = await chatService.sendMessageREST(
          activeUserIdRef.current,
          content,
          'TEXT'
        );
        setMessages(prev => [...prev, message]);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [isConnected]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await chatService.markConversationAsRead(conversationId);
      
      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.user.id === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  // Load conversations on mount or when roleFilter changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsUrlRef.current) {
        websocketService.disconnect(wsUrlRef.current);
      }
    };
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    sendMessage,
    loadConversations,
    loadConversation,
    markAsRead,
    isLoading,
    error,
    isConnected
  };
}
