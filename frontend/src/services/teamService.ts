import api from './api';
import type {
  Team,
  TeamCreateRequest,
  TeamUpdateRequest,
  Invitation,
  InvitationCreateRequest,
  InvitationResponse,
  TeamMemberAddRequest,
  TeamMemberRoleUpdateRequest,
  OwnershipTransferRequest,
  ApiResponse,
  PaginatedResponse,
  SportType
} from '@/types/team.types';

export class TeamService {
  private static readonly BASE_URL = '/api/teams';

  // Team CRUD operations
  static async createTeam(data: TeamCreateRequest): Promise<ApiResponse<Team>> {
    const response = await api.post(`${this.BASE_URL}/create/`, data);
    return response.data;
  }

  static async getTeams(params?: {
    sport?: SportType;
    owner?: string;
    member?: string;
    exclude_member?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Team>> {
    const response = await api.get(`${this.BASE_URL}/`, { params });
    return response.data;
  }

  static async getTeam(teamId: string): Promise<ApiResponse<Team>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/`);
    return response.data;
  }

  static async updateTeam(teamId: string, data: TeamUpdateRequest): Promise<ApiResponse<Team>> {
    const response = await api.put(`${this.BASE_URL}/${teamId}/update/`, data);
    return response.data;
  }

  static async deleteTeam(teamId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`${this.BASE_URL}/${teamId}/delete/`);
    return response.data;
  }

  // Team membership operations
  static async addMember(teamId: string, data: TeamMemberAddRequest): Promise<ApiResponse<void>> {
    const response = await api.post(`${this.BASE_URL}/${teamId}/members/add/`, data);
    return response.data;
  }

  static async addMembers(teamId: string, playerIds: string[]): Promise<ApiResponse<any>> {
    const response = await api.post(`${this.BASE_URL}/${teamId}/members/add/`, {
      player_ids: playerIds
    });
    return response.data;
  }

  static async removeMember(teamId: string, playerId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`${this.BASE_URL}/${teamId}/members/${playerId}/remove/`);
    return response.data;
  }

  static async updateMemberRole(
    teamId: string,
    playerId: string,
    data: TeamMemberRoleUpdateRequest
  ): Promise<ApiResponse<void>> {
    const response = await api.put(`${this.BASE_URL}/${teamId}/members/${playerId}/role/`, data);
    return response.data;
  }

  static async transferOwnership(
    teamId: string,
    data: OwnershipTransferRequest
  ): Promise<ApiResponse<void>> {
    const response = await api.post(`${this.BASE_URL}/${teamId}/transfer-ownership/`, data);
    return response.data;
  }

  // Invitation operations
  static async sendInvitation(
    teamId: string,
    data: InvitationCreateRequest
  ): Promise<ApiResponse<Invitation>> {
    const response = await api.post(`${this.BASE_URL}/${teamId}/invitations/send/`, data);
    return response.data;
  }

  static async getInvitations(teamId: string): Promise<ApiResponse<Invitation[]>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/invitations/`);
    return response.data;
  }

  static async getPendingInvitations(): Promise<ApiResponse<Invitation[]>> {
    const response = await api.get(`${this.BASE_URL}/invitations/`);
    return response.data;
  }

  static async respondToInvitation(
    invitationId: string,
    data: InvitationResponse
  ): Promise<ApiResponse<void>> {
    const response = await api.post(`${this.BASE_URL}/invitations/${invitationId}/respond/`, data);
    return response.data;
  }

  // Join request operations
  static async requestToJoinTeam(
    teamId: string,
    message?: string
  ): Promise<ApiResponse<any>> {
    const response = await api.post(`${this.BASE_URL}/${teamId}/join-requests/send/`, {
      message: message || ''
    });
    return response.data;
  }

  static async getTeamJoinRequests(teamId: string, status?: string): Promise<ApiResponse<any[]>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/join-requests/`, {
      params: status ? { status } : undefined
    });
    return response.data;
  }

  static async getMyJoinRequests(): Promise<ApiResponse<any[]>> {
    const response = await api.get(`${this.BASE_URL}/join-requests/`);
    return response.data;
  }

  static async respondToJoinRequest(
    requestId: string,
    response: 'ACCEPTED' | 'DECLINED'
  ): Promise<ApiResponse<void>> {
    const res = await api.post(`${this.BASE_URL}/join-requests/${requestId}/respond/`, {
      response
    });
    return res.data;
  }

  static async cancelJoinRequest(requestId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`${this.BASE_URL}/join-requests/${requestId}/cancel/`);
    return response.data;
  }

  // Analytics and reporting methods
  static async getTeamActivityStatistics(teamId: string): Promise<ApiResponse<any>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/activity/statistics/`);
    return response.data;
  }

  static async getTeamActivityHistory(
    teamId: string,
    params?: {
      limit?: number;
      offset?: number;
      event_types?: string[];
      date_from?: string;
      date_to?: string;
      performed_by_id?: string;
    }
  ): Promise<ApiResponse<any[]>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/activity/`, { params });
    return response.data;
  }

  static async getTeamActivitySummary(teamId: string, days?: number): Promise<ApiResponse<any>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/activity/summary/`, {
      params: days ? { days } : undefined
    });
    return response.data;
  }

  static async getTeamActivityTimeline(
    teamId: string,
    groupByDate?: boolean
  ): Promise<ApiResponse<any>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/activity/timeline/`, {
      params: groupByDate !== undefined ? { group_by_date: groupByDate } : undefined
    });
    return response.data;
  }

  static async searchTeamActivity(
    teamId: string,
    searchTerm: string,
    limit?: number
  ): Promise<ApiResponse<any[]>> {
    const response = await api.get(`${this.BASE_URL}/${teamId}/activity/search/`, {
      params: { search_term: searchTerm, limit }
    });
    return response.data;
  }

  // Utility methods
  static async getMyTeams(): Promise<PaginatedResponse<Team>> {
    return this.getTeams({ member: 'me' });
  }

  static async searchTeams(query: string, sport?: SportType): Promise<PaginatedResponse<Team>> {
    return this.getTeams({ search: query, sport, exclude_member: 'me' });
  }

  // Match scoring methods

  static async recordBadmintonMatchScore(
    matchId: string,
    setsData: Array<{
      set_number: number;
      home_score: number;
      away_score: number;
      duration: number;
    }>
  ): Promise<ApiResponse<any>> {
    const response = await api.post(`${this.BASE_URL}/matches/${matchId}/score/badminton/`, {
      sets_data: setsData
    });
    return response.data;
  }

  static async updateMatchScore(
    matchId: string,
    scoreUpdate: any
  ): Promise<ApiResponse<any>> {
    const response = await api.put(`${this.BASE_URL}/matches/${matchId}/score/update/`, scoreUpdate);
    return response.data;
  }

  static async validateMatchScore(
    sportType: 'FUTSAL' | 'BADMINTON',
    scoreData: any
  ): Promise<ApiResponse<any>> {
    const response = await api.post(`${this.BASE_URL}/matches/validate-score/`, {
      sport_type: sportType,
      score_data: scoreData
    });
    return response.data;
  }

  static async getMatchDetails(matchId: string): Promise<ApiResponse<any>> {
    const response = await api.get(`${this.BASE_URL}/matches/${matchId}/`);
    return response.data;
  }

  static async recordFutsalMatchScore(
    matchId: string,
    homeTeamData: any,
    awayTeamData: any
  ): Promise<ApiResponse<any>> {
    // We need to get the tournament ID from the match first
    const matchDetails = await this.getMatchDetails(matchId);
    if (!matchDetails.success) {
      throw new Error('Failed to get match details');
    }

    const tournamentId = matchDetails.data.tournament.id;
    
    const response = await api.post(
      `/api/tournaments/${tournamentId}/matches/${matchId}/futsal-score/`,
      {
        home_team_data: homeTeamData,
        away_team_data: awayTeamData
      }
    );
    return response.data;
  }
}

export default TeamService;