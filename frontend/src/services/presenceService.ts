// Presence Service for user online/offline status
import { api } from './api';

export interface PresenceStatus {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
}

export interface BulkPresenceResponse {
  presences: PresenceStatus[];
}

class PresenceService {
  // Get user presence status
  async getUserPresence(userId: string): Promise<PresenceStatus> {
    try {
      const response = await api.get<PresenceStatus>(`/api/chat/presence/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user presence:', error);
      throw error;
    }
  }

  // Get bulk presence for multiple users
  async getBulkPresence(userIds: string[]): Promise<BulkPresenceResponse> {
    try {
      const userIdsParam = userIds.join(',');
      const response = await api.get<BulkPresenceResponse>(
        `/api/chat/presence/bulk/?user_ids=${userIdsParam}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching bulk presence:', error);
      throw error;
    }
  }
}

export const presenceService = new PresenceService();
