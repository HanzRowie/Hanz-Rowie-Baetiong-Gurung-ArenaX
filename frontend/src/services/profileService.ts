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
      opponent_name: string;
      result: 'won' | 'lost' | 'pending';
      date: string;
      score?: string;
    }>;
    join_requests: Array<{
      id: string;
      other_player: string;
      status: string;
      created_at: string;
      type: 'sent' | 'received';
    }>;
    total_activities: number;
  }> {
    if (userId) {
      // Note: User activity history by ID endpoint may not be implemented in backend yet
      try {
        const response = await api.get(`/api/accounts/users/${userId}/activity/`);
        return response.data;
      } catch (error) {
        console.warn('User activity history by ID endpoint not implemented');
        return { tournaments: [], matches: [], join_requests: [], total_activities: 0 };
      }
    } else {
      const response = await api.get(API_ENDPOINTS.USERS.ACTIVITY);
      return response.data;
    }
  }

  async getUserStatistics(userId?: string): Promise<{
    tournaments_participated: number;
    tournaments_organized: number;
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    win_rate: number;
    favorite_sports: string[];
    recent_achievements: string[];
    activity_streak: number;
    total_connections: number;
    profile_completion: number;
  }> {
    if (userId) {
      // Note: User statistics by ID endpoint may not be implemented in backend yet
      try {
        const response = await api.get(`/api/accounts/users/${userId}/statistics/`);
        return response.data;
      } catch (error) {
        console.warn('User statistics by ID endpoint not implemented');
        return {
          tournaments_participated: 0,
          tournaments_organized: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
          win_rate: 0,
          favorite_sports: [],
          recent_achievements: [],
          activity_streak: 0,
          total_connections: 0,
          profile_completion: 0,
        };
      }
    } else {
      const response = await api.get(API_ENDPOINTS.USERS.STATISTICS);
      return response.data;
    }
  }

  async getUserAchievements(userId?: string): Promise<{
    achievements: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      earned_at: string;
      category: string;
    }>;
    total_points: number;
    rank: string;
    next_achievement?: {
      title: string;
      progress: number;
      target: number;
    };
  }> {
    if (userId) {
      // Note: User achievements by ID endpoint may not be implemented in backend yet
      try {
        const response = await api.get(`/api/accounts/users/${userId}/achievements/`);
        return response.data;
      } catch (error) {
        console.warn('User achievements by ID endpoint not implemented');
        return {
          achievements: [],
          total_points: 0,
          rank: 'Unranked',
        };
      }
    } else {
      const response = await api.get(API_ENDPOINTS.USERS.ACHIEVEMENTS);
      return response.data;
    }
  }

  async getPlayerConnections(userId?: string): Promise<{
    connections: ExtendedUserProfile[];
    total_connections: number;
    recent_connections: ExtendedUserProfile[];
    mutual_connections?: ExtendedUserProfile[];
  }> {
    if (userId) {
      // Note: User connections by ID endpoint may not be implemented in backend yet
      try {
        const response = await api.get(`/api/accounts/users/${userId}/connections/`);
        return response.data;
      } catch (error) {
        console.warn('User connections by ID endpoint not implemented');
        return { connections: [], total_connections: 0, recent_connections: [] };
      }
    } else {
      const response = await api.get('/api/accounts/users/connections/');
      return response.data;
    }
  }

  async getRecentActivity(userId?: string, limit: number = 10): Promise<{
    activities: Array<{
      id: string;
      type: 'tournament_join' | 'match_result' | 'connection_made' | 'achievement_earned';
      title: string;
      description: string;
      timestamp: string;
      related_object?: any;
    }>;
    has_more: boolean;
  }> {
    if (userId) {
      // Note: User recent activity by ID endpoint may not be implemented in backend yet
      try {
        const response = await api.get(`/api/accounts/users/${userId}/recent-activity/?limit=${limit}`);
        return response.data;
      } catch (error) {
        console.warn('User recent activity by ID endpoint not implemented');
        return { activities: [], has_more: false };
      }
    } else {
      const response = await api.get(`/api/accounts/users/recent-activity/?limit=${limit}`);
      return response.data;
    }
  }

  async getPlayerRankings(sport?: string, location?: string): Promise<{
    rankings: Array<{
      rank: number;
      user: ExtendedUserProfile;
      points: number;
      tournaments_won: number;
      win_rate: number;
    }>;
    user_rank?: number;
    total_players: number;
  }> {
    // Note: This endpoint may not be implemented in backend yet
    try {
      const params = new URLSearchParams();
      if (sport) params.append('sport', sport);
      if (location) params.append('location', location);

      const response = await api.get(`/api/accounts/users/rankings/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.warn('Player rankings endpoint not implemented');
      return { rankings: [], total_players: 0 };
    }
  }
}

export const profileService = new ProfileService();
