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
    const url = userId ? `/api/users/profile/${userId}` : API_ENDPOINTS.USERS.ME;
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

    const response = await api.put('/api/users/profile', formData, {
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
    const response = await api.get('/api/users/matches');
    return response.data;
  }

  async sendJoinRequest(userId: string): Promise<{ message: string; request: JoinRequest }> {
    const response = await api.post(`/api/users/${userId}/send-request`);
    return response.data;
  }

  async respondJoinRequest(requestId: string, action: 'accept' | 'decline'): Promise<{ message: string; request: { id: string; status: string } }> {
    const response = await api.put(`/api/join-requests/${requestId}/respond`, { action });
    return response.data;
  }

  async getMyJoinRequests(): Promise<JoinRequestResponse> {
    const response = await api.get('/api/join-requests/my');
    return response.data;
  }

  async cancelJoinRequest(requestId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/join-requests/${requestId}/cancel`);
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
    const url = userId ? `/api/users/${userId}/activity` : '/api/users/activity';
    const response = await api.get(url);
    return response.data;
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
    const url = userId ? `/api/users/${userId}/statistics` : '/api/users/statistics';
    const response = await api.get(url);
    return response.data;
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
    const url = userId ? `/api/users/${userId}/achievements` : '/api/users/achievements';
    const response = await api.get(url);
    return response.data;
  }

  async getPlayerConnections(userId?: string): Promise<{
    connections: ExtendedUserProfile[];
    total_connections: number;
    recent_connections: ExtendedUserProfile[];
    mutual_connections?: ExtendedUserProfile[];
  }> {
    const url = userId ? `/api/users/${userId}/connections` : '/api/users/connections';
    const response = await api.get(url);
    return response.data;
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
    const url = userId ? `/api/users/${userId}/recent-activity` : '/api/users/recent-activity';
    const response = await api.get(`${url}?limit=${limit}`);
    return response.data;
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
    const params = new URLSearchParams();
    if (sport) params.append('sport', sport);
    if (location) params.append('location', location);

    const response = await api.get(`/api/users/rankings?${params.toString()}`);
    return response.data;
  }
}

export const profileService = new ProfileService();
