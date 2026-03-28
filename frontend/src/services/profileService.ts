import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import type { ExtendedUserProfile, Match } from '@/types';

export interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  bio?: string;
  location?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  preferred_sports?: string[];
  skill_level?: string;
  achievements?: string;
  social_links?: Record<string, string>;
  is_available_for_matches?: boolean;
  profile_picture?: File;
  business_name?: string;
  business_registration?: string;
  business_contact?: string;
}

export interface PlayerSearchFilters {
  q?: string;
  sport?: string;
  location?: string;
  skill_level?: string;
}

export interface JoinRequest {
  id: string;
  to_player: {
    id: string;
    full_name: string;
    profile_picture?: string;
  };
  from_player?: {
    id: string;
    full_name: string;
    profile_picture?: string;
  };
  status: string;
  created_at: string;
}

export interface JoinRequestResponse {
  sent_requests: JoinRequest[];
  received_requests: JoinRequest[];
  sent_count: number;
  received_count: number;
  pending_count: number;
}

export interface PlayerConnectionsResponse {
  connections: ExtendedUserProfile[];
  total_connections: number;
  recent_connections?: ExtendedUserProfile[];
  mutual_connections?: ExtendedUserProfile[];
}

class ProfileService {
  async getUserProfile(userId?: string): Promise<{ profile: ExtendedUserProfile }> {
    const url = userId ? `/api/accounts/users/profile/${userId}` : API_ENDPOINTS.USERS.ME;
    const response = await api.get(url);

    // Backend consistently returns { profile: profile_data } for all cases
    return response.data;
  }

  async updateProfile(data: UpdateProfileData): Promise<{ profile: ExtendedUserProfile; message: string }> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'profile_picture' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'preferred_sports' || key === 'social_links') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await api.put(API_ENDPOINTS.USERS.PROFILE_UPDATE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async searchPlayers(filters: PlayerSearchFilters): Promise<{ players: ExtendedUserProfile[]; count: number }> {
    const params = new URLSearchParams();

    if (filters.q) params.append('q', filters.q);
    if (filters.sport) params.append('sport', filters.sport);
    if (filters.location) params.append('location', filters.location);
    if (filters.skill_level) params.append('skill_level', filters.skill_level);

    const response = await api.get(`${API_ENDPOINTS.USERS.SEARCH}?${params.toString()}`);
    return response.data;
  }

  async getUserMatches(): Promise<{ matches: Match[]; count: number }> {
    // Note: This endpoint may not be implemented in backend yet
    try {
      const response = await api.get('/api/accounts/users/matches/');
      return response.data;
    } catch (error) {
      console.warn('User matches endpoint not implemented');
      return { matches: [], count: 0 };
    }
  }

  async sendJoinRequest(userId: string): Promise<{ message: string; request: JoinRequest }> {
    const response = await api.post(`/api/accounts/users/${userId}/send-request/`);
    return response.data;
  }

  async respondJoinRequest(requestId: string, action: 'accept' | 'decline'): Promise<{ message: string; request: { id: string; status: string } }> {
    const response = await api.put(`/api/accounts/join-requests/${requestId}/respond/`, { action });
    return response.data;
  }

  async getMyJoinRequests(): Promise<JoinRequestResponse> {
    const response = await api.get('/api/accounts/join-requests/my/');
    return response.data;
  }

  async cancelJoinRequest(requestId: string): Promise<{ message: string }> {
    // Note: This endpoint may not be implemented in backend yet
    try {
      const response = await api.delete(`/api/accounts/join-requests/${requestId}/cancel/`);
      return response.data;
    } catch (error) {
      console.warn('Cancel join request endpoint not implemented');
      throw error;
    }
  }

  async getPlayerConnections(): Promise<PlayerConnectionsResponse> {
    const response = await api.get('/api/accounts/users/connections/');
    return response.data;
  }

  // Enhanced activity history and statistics endpoints
  async getUserActivityHistory(userId?: string): Promise<{
    tournaments: Array<{
      id: string;
      title: string;
      sport_type: string;
      date: string;
      status: string;
      role: 'participant' | 'organizer';
      result?: 'won' | 'lost' | 'ongoing';
    }>;
    matches: Array<{
      id: string;
      tournament_title: string;
      opponent: string;
      result: 'won' | 'lost' | 'draw';
      date: string;
    }>;
  }> {
    const url = userId 
      ? `/api/accounts/users/${userId}/activity/` 
      : '/api/accounts/users/me/activity/';
    
    const response = await api.get(url);
    return response.data;
  }

  async getUserStatistics(userId?: string): Promise<{
    total_tournaments: number;
    total_matches: number;
    win_rate: number;
    favorite_sport: string;
    achievements: string[];
  }> {
    const url = userId 
      ? `/api/accounts/users/${userId}/statistics/` 
      : '/api/accounts/users/me/statistics/';
    
    const response = await api.get(url);
    return response.data;
  }
}

export const profileService = new ProfileService();
export default profileService;
