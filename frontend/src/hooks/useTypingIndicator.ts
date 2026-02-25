import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/services/websocketService';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface UseTypingIndicatorReturn {
  typingUsers: Map<string, TypingUser>;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTypingIndicator(
  conversationId: string,
  wsUrl?: string
): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!wsUrl) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    websocketService.send(wsUrl, {
      type: 'typing',
      conversation_id: conversationId,
      is_typing: true
    });

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [conversationId, wsUrl]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!wsUrl) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send stop typing indicator
    websocketService.send(wsUrl, {
      type: 'stop_typing',
      conversation_id: conversationId,
      is_typing: false
    });
  }, [conversationId, wsUrl]);

  // Subscribe to typing events via WebSocket
  useEffect(() => {
    if (!wsUrl) return;

    // Get existing WebSocket connection
    const ws = websocketService.getConnection(wsUrl);
    if (!ws) return;

    // Setup cleanup interval to remove stale typing indicators
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        let hasChanges = false;

        // Remove typing indicators older than 5 seconds
        newMap.forEach((user, userId) => {
          if (now - user.timestamp > 5000) {
            newMap.delete(userId);
            hasChanges = true;
          }
        });

        return hasChanges ? newMap : prev;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      // Stop typing when component unmounts
      stopTyping();

      // Clear intervals and timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [wsUrl, stopTyping]);

  // Handle incoming typing events
  // Note: This should be integrated with the WebSocket message handler
  // The actual typing events will be received through the WebSocket handlers
  // passed to useWebSocket or useChat hooks
  
  // Expose a method to update typing users (to be called from parent component)
  useEffect(() => {
    // This effect is intentionally empty as typing updates
    // should be handled by the parent component's WebSocket handler
    // which will call a callback to update the typing state
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
}

// Helper hook for managing typing state in conversations
export function useConversationTyping(conversationId: string, wsUrl?: string) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const { startTyping, stopTyping } = useTypingIndicator(conversationId, wsUrl);

  // Method to update typing users from WebSocket messages
  const handleTypingEvent = useCallback((userId: string, userName: string, isTyping: boolean) => {
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      if (isTyping) {
        newMap.set(userId, {
          userId,
          userName,
          timestamp: Date.now()
        });
      } else {
        newMap.delete(userId);
      }
      return newMap;
    });
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    handleTypingEvent
  };
}
