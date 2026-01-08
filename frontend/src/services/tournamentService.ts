import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import type { Tournament, TournamentRegistration, Match } from '@/types';

export interface CreateTournamentData {
  title: string;
  description?: string;
  sport_type: string;
  tournament_type?: string;
  date: string;
  start_time: string;
  end_time?: string;
  venue: string;
  venue_address?: string;
  entry_fee: number;
  max_participants?: number;
  min_participants?: number;
  registration_deadline: string;
  prize_pool?: number;
  rules?: string;
  tournament_image?: File;
  linked_venue_id?: string; // New field for venue selection
}

export interface TournamentFilters {
  sport_type?: string;
  tournament_type?: string;
  status?: string;
  location?: string;
  entry_fee_max?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

class TournamentService {
  async createTournament(data: CreateTournamentData): Promise<{ tournament: Tournament; message: string }> {
    const formData = new FormData();
    
    // Add all fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tournament_image' && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await api.post(API_ENDPOINTS.TOURNAMENTS.CREATE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async getTournaments(filters?: TournamentFilters): Promise<{ tournaments: Tournament[]; count: number }> {
    const params = new URLSearchParams();

    if (filters?.sport_type) params.append('sport_type', filters.sport_type);
    if (filters?.tournament_type) params.append('tournament_type', filters.tournament_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.entry_fee_max) params.append('entry_fee_max', filters.entry_fee_max.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    const response = await api.get(`${API_ENDPOINTS.TOURNAMENTS.LIST}?${params.toString()}`);

    // Handle both paginated and simple array responses
    if (Array.isArray(response.data)) {
      // Simple array response from backend
      return {
        tournaments: response.data,
        count: response.data.length
      };
    } else {
      // Django DRF paginated response { count, next, previous, results }
      return {
        tournaments: response.data.results || [],
        count: response.data.count || 0
      };
    }
  }

  async getTournamentDetail(tournamentId: string): Promise<{ tournament: Tournament }> {
    const response = await api.get(API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId));
    
    // Handle both wrapped and direct responses
    if (response.data.tournament) {
      // Response is wrapped: {tournament: {...}}
      return response.data;
    } else {
      // Response is direct tournament object
      return { tournament: response.data };
    }
  }

  async registerForTournament(tournamentId: string, notes?: string): Promise<{ registration: TournamentRegistration; message: string }> {
    const response = await api.post(API_ENDPOINTS.TOURNAMENTS.REGISTER(tournamentId), { notes });
    return response.data;
  }

  async withdrawFromTournament(tournamentId: string): Promise<{ message: string }> {
    const response = await api.delete(API_ENDPOINTS.TOURNAMENTS.WITHDRAW(tournamentId));
    return response.data;
  }

  async getMyTournaments(): Promise<{ organized_tournaments: Tournament[]; registered_tournaments: Tournament[] }> {
    try {
      const response = await api.get(API_ENDPOINTS.TOURNAMENTS.MY);
      // Ensure the response has the expected structure
      return {
        organized_tournaments: response.data?.organized_tournaments || [],
        registered_tournaments: response.data?.registered_tournaments || []
      };
    } catch (error) {
      console.warn('Failed to fetch tournaments, returning empty arrays');
      return {
        organized_tournaments: [],
        registered_tournaments: []
      };
    }
  }

  async generateBracket(tournamentId: string): Promise<{ message: string; matches_created: number }> {
    const response = await api.post(API_ENDPOINTS.TOURNAMENTS.GENERATE_BRACKET(tournamentId));
    return response.data;
  }

  async updateMatchResult(
    tournamentId: string, 
    matchId: string, 
    data: { player1_score: number; player2_score: number; winner_id?: string }
  ): Promise<{ match: Match; message: string }> {
    const response = await api.put(API_ENDPOINTS.TOURNAMENTS.MATCH_RESULT(tournamentId, matchId), data);
    return response.data;
  }

  // Enhanced bracket management endpoints
  async getTournamentBracket(tournamentId: string): Promise<{ 
    bracket: any; 
    matches: Match[]; 
    rounds: number;
    current_round: number;
  }> {
    const response = await api.get(API_ENDPOINTS.TOURNAMENTS.BRACKET(tournamentId));
    return response.data;
  }

  async regenerateBracket(tournamentId: string): Promise<{ message: string; matches_created: number }> {
    const response = await api.post(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/regenerate-bracket`);
    return response.data;
  }

  async getMatchesByRound(tournamentId: string, round: number): Promise<{ matches: Match[] }> {
    const response = await api.get(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/matches?round=${round}`);
    return response.data;
  }

  async advanceToNextRound(tournamentId: string): Promise<{ message: string; next_round_matches: Match[] }> {
    const response = await api.post(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/advance-round`);
    return response.data;
  }

  async getTournamentProgress(tournamentId: string): Promise<{
    total_rounds: number;
    current_round: number;
    completed_matches: number;
    total_matches: number;
    completion_percentage: number;
    status: string;
  }> {
    const response = await api.get(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/progress`);
    return response.data;
  }

  async resetTournament(tournamentId: string): Promise<{ message: string }> {
    const response = await api.post(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/reset`);
    return response.data;
  }

  async finalizeTournament(tournamentId: string): Promise<{ 
    message: string; 
    winner: any;
    final_standings: any[];
  }> {
    const response = await api.post(`${API_ENDPOINTS.TOURNAMENTS.BY_ID(tournamentId)}/finalize`);
    return response.data;
  }
}

export const tournamentService = new TournamentService();
