import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { websocketService } from '@/services/websocketService';
import type { RootState } from '@/store';
import type { 
  AdminWebSocketMessage, 
  WebSocketStatus,
  NewUserRegistrationMessage,
  UserApprovedMessage,
  UserRejectedMessage,
  TournamentSubmittedMessage,
  VenueSubmittedMessage,
  TournamentStatusChangedMessage,
  VenueStatusChangedMessage
} from '@/types/admin.types';

/**
 * WebSocket event handlers for admin dashboard
 */
interface AdminWebSocketHandlers {
  onNewUserRegistration?: (message: NewUserRegistrationMessage) => void;
  onUserApproved?: (message: UserApprovedMessage) => void;
  onUserRejected?: (message: UserRejectedMessage) => void;
  onTournamentSubmitted?: (message: TournamentSubmittedMessage) => void;
  onVenueSubmitted?: (message: VenueSubmittedMessage) => void;
  onTournamentStatusChanged?: (message: TournamentStatusChangedMessage) => void;
  onVenueStatusChanged?: (message: VenueStatusChangedMessage) => void;
  onConnectionError?: () => void;
}

/**
 * Return type for useAdminWebSocket hook
 */
interface UseAdminWebSocketReturn {
  connectionStatus: WebSocketStatus;
  lastMessage: AdminWebSocketMessage | null;
  isConnected: boolean;
  disconnect: () => void;
}

/**
 * Custom hook for managing admin dashboard WebSocket connection
 * 
 * Requirements:
 * - 12.2: WebSocket connection with authentication
 * - 12.3: Real-time dashboard updates
 * - 12.6: Connection status indicator
 * - 12.7: Automatic reconnection handling
 * - 7.1: Real-time tournament submission notifications
 * - 7.2: Real-time venue submission notifications
 * - 7.3: Real-time tournament status change notifications
 * - 7.4: Real-time venue status change notifications
 * 
 * Features:
 * - Automatic connection for ADMIN users
 * - Role-based access control (ADMIN only)
 * - Automatic reconnection with exponential backoff
 * - Connection status tracking
 * - Message parsing and type-safe event handlers
 * - React Query cache invalidation on events
 * 
 * @param handlers - Optional event handlers for WebSocket messages
 * @returns WebSocket connection state and controls
 */
export function useAdminWebSocket(handlers?: AdminWebSocketHandlers): UseAdminWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<AdminWebSocketMessage | null>(null);
  
  // Get user from Redux store
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  
  // Get React Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Store handlers in ref to avoid reconnection on handler changes
  const handlersRef = useRef<AdminWebSocketHandlers | undefined>(handlers);
  
  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Build WebSocket URL with authentication token
  const getWebSocketUrl = useCallback((): string | null => {
    if (!accessToken) {
      console.warn('Cannot connect to admin WebSocket: No access token');
      return null;
    }

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    return `${wsBaseUrl}/ws/admin/dashboard/?token=${accessToken}`;
  }, [accessToken]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    const url = getWebSocketUrl();
    if (url) {
      websocketService.disconnect(url);
      setConnectionStatus('disconnected');
    }
  }, [getWebSocketUrl]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: AdminWebSocketMessage) => {
    console.log('Admin WebSocket message received:', message);
    setLastMessage(message);

    // Route message to appropriate handler
    switch (message.type) {
      case 'connection_established':
        console.log('Admin WebSocket connection established');
        break;

      case 'new_user_registration':
        handlersRef.current?.onNewUserRegistration?.(message);
        // Invalidate user stats and list queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        break;

      case 'user_approved':
        handlersRef.current?.onUserApproved?.(message);
        // Invalidate user stats and list queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        break;

      case 'user_rejected':
        handlersRef.current?.onUserRejected?.(message);
        // Invalidate user stats and list queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        break;

      case 'tournament_submitted':
        handlersRef.current?.onTournamentSubmitted?.(message);
        // Invalidate tournament stats and list queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'tournaments', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'tournaments'] });
        break;

      case 'venue_submitted':
        handlersRef.current?.onVenueSubmitted?.(message);
        // Invalidate venue stats and list queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'venues', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
        break;

      case 'tournament_status_changed':
        handlersRef.current?.onTournamentStatusChanged?.(message);
        // Invalidate tournament stats, list, and detail queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'tournaments', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'tournaments'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'tournaments', message.resource_id] });
        break;

      case 'venue_status_changed':
        handlersRef.current?.onVenueStatusChanged?.(message);
        // Invalidate venue stats, list, and detail queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'venues', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'venues', message.resource_id] });
        break;

      default:
        console.warn('Unknown admin WebSocket message type:', message);
    }
  }, [queryClient]);

  // Connect to WebSocket when user is ADMIN
  useEffect(() => {
    // Only connect if user is authenticated and has ADMIN role
    if (!user || (user.role as string) !== 'ADMIN') {
      console.log('Admin WebSocket: User is not an admin, skipping connection');
      setConnectionStatus('disconnected');
      return;
    }

    const url = getWebSocketUrl();
    if (!url) {
      console.error('Admin WebSocket: Cannot build WebSocket URL');
      setConnectionStatus('error');
      return;
    }

    console.log('Admin WebSocket: Connecting to', url);
    setConnectionStatus('connecting');

    // Connect to WebSocket with handlers
    websocketService.connect(url, {
      onOpen: () => {
        console.log('Admin WebSocket: Connection opened');
        setConnectionStatus('connected');
      },

      onMessage: (data: any) => {
        handleMessage(data as AdminWebSocketMessage);
      },

      onClose: (code?: number, reason?: string) => {
        console.log('Admin WebSocket: Connection closed', code, reason);
        setConnectionStatus('disconnected');
        
        // Handle authentication/authorization errors
        if (code === 4001 || code === 4003) {
          console.error('Admin WebSocket: Authentication/Authorization error');
          setConnectionStatus('error');
        }
      },

      onError: (error: Event) => {
        console.error('Admin WebSocket: Error', error);
        setConnectionStatus('error');
      },

      onConnectionError: () => {
        console.error('Admin WebSocket: Connection error (max retries reached)');
        setConnectionStatus('error');
        handlersRef.current?.onConnectionError?.();
      },

      onAuthError: () => {
        console.error('Admin WebSocket: Authentication error');
        setConnectionStatus('error');
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('Admin WebSocket: Cleaning up connection');
      websocketService.disconnect(url);
    };
  }, [user, getWebSocketUrl, handleMessage]);

  return {
    connectionStatus,
    lastMessage,
    isConnected: connectionStatus === 'connected',
    disconnect
  };
}
