import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/chatService';
import type { Conversation, PrivateMessage, ConversationsResponse } from '@/services/chatService';
import { websocketService } from '@/services/websocketService';
import type { WebSocketHandlers } from '@/types/chat.types';

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
      } else if (response.other_user) {
        // Create conversation object from response
        const lastMessage = response.messages.at(-1);
        setActiveConversation({
          user: response.other_user,
          latest_message: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            is_from_me: lastMessage.is_from_me
          } : {
            id: '',
            content: '',
            timestamp: new Date().toISOString(),
            is_from_me: false
          },
          unread_count: 0
        });
      }

      activeUserIdRef.current = userId;

      // Connect to WebSocket for real-time updates using DirectChatConsumer
      const token = localStorage.getItem('access_token');
      if (token) {
        const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
        // Use DirectChatConsumer endpoint that supports all user roles
        const wsUrl = `${wsBaseUrl}/ws/chat/direct/?token=${token}`;
        wsUrlRef.current = wsUrl;

        const handlers: WebSocketHandlers = {
          onOpen: () => setIsConnected(true),
          onClose: () => setIsConnected(false),
          onMessage: (data: any) => {
            if (data.type === 'chat_message' && data.message) {
              // Only add message if it's for the active conversation
              const msg = data.message;
              if (msg.sender_id === userId || msg.receiver_id === userId) {
                // Construct a proper Message object from WebSocket data
                const newMessage: PrivateMessage = {
                  id: msg.id,
                  content: msg.content,
                  timestamp: msg.timestamp,
                  is_from_me: msg.sender_id !== userId,
                  status: msg.status || 'SENT',
                  message_type: msg.message_type || 'TEXT',
                  read: false,
                  edited: msg.edited || false,
                  deleted: msg.deleted || false,
                  sender: msg.sender || { id: msg.sender_id, username: '', full_name: '' },
                  receiver: msg.receiver || { id: msg.receiver_id, username: '', full_name: '' }
                };
                
                setMessages(prev => [...prev, newMessage]);
                
                // Update conversation list
                setConversations(prev => {
                  const updated = prev.map(c => {
                    if (c.user.id === userId) {
                      return {
                        ...c,
                        latest_message: {
                          id: msg.id,
                          content: msg.content,
                          timestamp: msg.timestamp,
                          is_from_me: msg.sender_id !== userId
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
            } else if (data.type === 'typing_indicator') {
              // Handle typing indicators
              console.log('Typing indicator:', data);
            }
          },
          onError: (err: Event) => {
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
          type: 'chat_message',
          receiver_id: activeUserIdRef.current,
          message: content.trim(),
          message_type: 'TEXT'
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
