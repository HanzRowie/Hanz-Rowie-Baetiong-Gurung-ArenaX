import { api } from './api';

export interface OrganizerStats {
  totalTournaments: number;
  totalParticipants: number;
  upcomingEvents: number;
  completedEvents: number;
  totalRevenue: number;
  averageParticipants: number;
  fillRate: number;
  revenueGrowth: number;
}

export interface RecentMatch {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
  };
  team1?: {
    id: string;
    name: string;
  };
  team2?: {
    id: string;
    name: string;
  };
  player1?: {
    id: string;
    full_name: string;
  };
  player2?: {
    id: string;
    full_name: string;
  };
  team1_score: number;
  team2_score: number;
  status: string;
  completed_at: string;
  round_number: number;
  match_number: number;
}

export interface RecentActivity {
  id: string;
  type: 'registration' | 'match_result' | 'payment' | 'tournament_created' | 'referee_assigned';
  message: string;
  timestamp: string;
  tournament?: {
    id: string;
    title: string;
  };
  player?: {
    id: string;
    full_name: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface MatchReport {
  tournament_id: string;
  tournament_title: string;
  sport_type: string;
  total_matches: number;
  completed_matches: number;
  participants: number;
  start_date: string;
  end_date: string;
  status: string;
}

class OrganizerDashboardService {
  async getOrganizerStats(): Promise<OrganizerStats> {
    try {
      console.log('Calling organizer stats API...');
      const response = await api.get('/api/organizers/dashboard/organizer-stats/');
      console.log('Organizer stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching organizer stats:', error);
      throw error;
    }
  }

  async getRecentMatches(limit: number = 10): Promise<RecentMatch[]> {
    try {
      console.log('Calling recent matches API...');
      const response = await api.get(`/api/organizers/dashboard/recent-matches/?limit=${limit}`);
      console.log('Recent matches response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent matches:', error);
      throw error;
    }
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      console.log('Calling recent activity API...');
      const response = await api.get(`/api/organizers/dashboard/recent-activity/?limit=${limit}`);
      console.log('Recent activity response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  async getMatchReports(): Promise<MatchReport[]> {
    try {
      console.log('Calling match reports API...');
      const response = await api.get('/api/organizers/dashboard/match-reports/');
      console.log('Match reports response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching match reports:', error);
      throw error;
    }
  }

  async downloadMatchReport(tournamentId: string, format: 'pdf' | 'csv' = 'pdf'): Promise<Blob> {
    try {
      const response = await api.get(`/api/organizers/dashboard/match-reports/${tournamentId}/download/`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading match report:', error);
      throw error;
    }
  }

  async downloadAllMatchReports(format: 'pdf' | 'csv' = 'pdf'): Promise<Blob> {
    try {
      const response = await api.get('/api/organizers/dashboard/match-reports/download-all/', {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading all match reports:', error);
      throw error;
    }
  }
}

export const organizerDashboardService = new OrganizerDashboardService();