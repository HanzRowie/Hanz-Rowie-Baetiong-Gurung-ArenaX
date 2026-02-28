import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/services/websocketService';
import type { WebSocketHandlers } from '@/types/chat.types';

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: any) => void;
  disconnect: () => void;
  connect: (url: string, handlers: WebSocketHandlers) => void;
}

export function useWebSocket(url: string, handlers?: WebSocketHandlers): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const urlRef = useRef<string>(url);
  const handlersRef = useRef<WebSocketHandlers | undefined>(handlers);

  // Update refs when props change
  useEffect(() => {
    urlRef.current = url;
    handlersRef.current = handlers;
  }, [url, handlers]);

  // Connect to WebSocket
  const connect = useCallback((connectUrl: string, connectHandlers: WebSocketHandlers) => {
    const enhancedHandlers: WebSocketHandlers = {
      ...connectHandlers,
      onOpen: () => {
        setIsConnected(true);
        connectHandlers.onOpen?.();
      },
      onClose: () => {
        setIsConnected(false);
        connectHandlers.onClose?.();
      }
    };

    websocketService.connect(connectUrl, enhancedHandlers);
  }, []);

  // Send data through WebSocket
  const send = useCallback((data: any) => {
    if (urlRef.current) {
      websocketService.send(urlRef.current, data);
    } else {
      console.warn('Cannot send data: No WebSocket URL specified');
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (urlRef.current) {
      websocketService.disconnect(urlRef.current);
      setIsConnected(false);
    }
  }, []);

  // Auto-connect on mount if URL and handlers are provided
  useEffect(() => {
    if (url && handlers) {
      const enhancedHandlers: WebSocketHandlers = {
        ...handlers,
        onOpen: () => {
          setIsConnected(true);
          handlers.onOpen?.();
        },
        onClose: () => {
          setIsConnected(false);
          handlers.onClose?.();
        }
      };

      websocketService.connect(url, enhancedHandlers);

      // Cleanup on unmount
      return () => {
        websocketService.disconnect(url);
      };
    }
  }, [url, handlers]);

  return {
    isConnected,
    send,
    disconnect,
    connect
  };
}
