import { useState, useEffect, useCallback } from 'react';
import { presenceService, PresenceStatus } from '@/services/presenceService';
import { websocketService, WebSocketHandlers } from '@/services/websocketService';

interface UsePresenceReturn {
  presenceMap: Map<string, PresenceStatus>;
  loadPresence: (userIds: string[]) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function usePresence(userIds: string[] = []): UsePresenceReturn {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load presence for multiple users
  const loadPresence = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await presenceService.getBulkPresence(ids);
      const newMap = new Map<string, PresenceStatus>();
      response.presences.forEach(presence => {
        newMap.set(presence.user_id, presence);
      });
      setPresenceMap(newMap);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load presence:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to presence updates via WebSocket
  useEffect(() => {
    if (userIds.length === 0) return;

    // Load initial presence
    loadPresence(userIds);

    // Setup WebSocket for real-time presence updates
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${wsBaseUrl}/ws/presence/?token=${token}`;

    const handlers: WebSocketHandlers = {
      onOpen: () => {
        console.log('Connected to presence WebSocket');
        // Subscribe to presence updates for specific users
        websocketService.send(wsUrl, {
          type: 'subscribe',
          user_ids: userIds
        });
      },
      onMessage: (data) => {
        if (data.type === 'presence' && data.user_id) {
          // Update presence map
          setPresenceMap(prev => {
            const newMap = new Map(prev);
            newMap.set(data.user_id, {
              user_id: data.user_id,
              is_online: data.is_online,
              last_seen: data.last_seen
            });
            return newMap;
          });
        }
      },
      onError: (err) => {
        console.error('Presence WebSocket error:', err);
      },
      onClose: () => {
        console.log('Disconnected from presence WebSocket');
      }
    };

    websocketService.connect(wsUrl, handlers);

    // Cleanup on unmount
    return () => {
      websocketService.disconnect(wsUrl);
    };
  }, [userIds, loadPresence]);

  return {
    presenceMap,
    loadPresence,
    isLoading,
    error
  };
}
