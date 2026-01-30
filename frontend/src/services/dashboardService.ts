import { api } from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import type { 
  DashboardLayout, 
  DashboardPreferences, 
  GetDashboardLayoutResponse,
  SaveDashboardLayoutResponse,
  BaseWidget
} from '@/types/dashboard.types';
import { UserRole } from '@/types/auth.types';

export interface DashboardStats {
  upcomingMatches: number;
  totalTournaments: number;
  totalParticipants: number;
  winRate: number;
  matchesWon: number;
  matchesPlayed: number;
  sport_rankings?: Record<string, SportRanking>;
  venue_bookings?: VenueBooking[];
}

export interface SportRanking {
  ranking: number;
  total_players: number;
  percentile: number;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  total_goals?: number;
  total_assists?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  sets_won?: number;
  sets_lost?: number;
  set_win_rate?: number;
}

export interface VenueBooking {
  id: string;
  venue_name: string;
  venue_location: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  amount: string;
  purpose: string;
}

export interface MonthlyStats {
  month: string;
  wins: number;
  losses: number;
  tournaments: number;
}

export interface NextTournament {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue?: string;
  sport?: string;
  registration_type?: string;
  match_scheduled?: boolean;
  opponent?: {
    name: string;
    type: 'player' | 'team';
  } | null;
  match_time?: string;
  match_id?: string;
  round_number?: number;
  match_number?: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country: string;
  age: number;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  wtaRanking?: number;
  atpRanking?: number;
  bio: string;
  profilePicture?: string;
}

class DashboardService {
  // Enhanced Dashboard Layout Methods
  async getDashboardLayout(userId: string): Promise<GetDashboardLayoutResponse> {
    try {
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.LAYOUT}/${userId}`);
      return response.data;
    } catch (error) {
      // Return default layout if API fails
      return this.getDefaultDashboardLayout(userId);
    }
  }

  async getDashboardLayoutById(layoutId: string): Promise<DashboardLayout> {
    try {
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.LAYOUT}/id/${layoutId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load dashboard layout');
    }
  }

  async saveDashboardLayout(layout: DashboardLayout): Promise<SaveDashboardLayoutResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.DASHBOARD.LAYOUT, { layout });
      return response.data;
    } catch (error) {
      throw new Error('Failed to save dashboard layout');
    }
  }

  async resetDashboardLayout(userId: string): Promise<void> {
    try {
      await api.delete(`${API_ENDPOINTS.DASHBOARD.LAYOUT}/${userId}`);
    } catch (error) {
      throw new Error('Failed to reset dashboard layout');
    }
  }

  async updateDashboardPreferences(preferences: DashboardPreferences): Promise<void> {
    try {
      await api.put(API_ENDPOINTS.DASHBOARD.PREFERENCES, preferences);
    } catch (error) {
      throw new Error('Failed to update dashboard preferences');
    }
  }

  // Generate default dashboard layout based on user role
  private getDefaultDashboardLayout(userId: string): GetDashboardLayoutResponse {
    const now = new Date().toISOString();
    
    // This would typically be determined by the user's role from the API
    // For now, we'll create a generic layout
    const defaultWidgets: BaseWidget[] = [
      {
        id: 'stats-1',
        type: 'stats-card',
        title: 'Total Matches',
        size: 'sm',
        position: { x: 0, y: 0, w: 1, h: 1 },
        visible: true,
        configurable: true,
        removable: true,
        data: {
          value: '24',
          label: 'Matches Played',
          change: { value: 12.5, type: 'increase', period: 'vs last month' }
        }
      },
      {
        id: 'stats-2',
        type: 'stats-card',
        title: 'Win Rate',
        size: 'sm',
        position: { x: 1, y: 0, w: 1, h: 1 },
        visible: true,
        configurable: true,
        removable: true,
        data: {
          value: '68.5%',
          label: 'Win Rate',
          change: { value: 5.2, type: 'increase', period: 'vs last month' }
        }
      },
      {
        id: 'chart-1',
        type: 'chart',
        title: 'Performance Over Time',
        size: 'lg',
        position: { x: 0, y: 1, w: 2, h: 2 },
        visible: true,
        configurable: true,
        removable: true,
        config: { chartType: 'line' }
      },
      {
        id: 'quick-actions-1',
        type: 'quick-actions',
        title: 'Quick Actions',
        size: 'md',
        position: { x: 2, y: 0, w: 1, h: 2 },
        visible: true,
        configurable: false,
        removable: true
      },
      {
        id: 'timeline-1',
        type: 'timeline',
        title: 'Recent Activity',
        size: 'md',
        position: { x: 0, y: 3, w: 2, h: 2 },
        visible: true,
        configurable: true,
        removable: true
      },
      {
        id: 'intelligence-1',
        type: 'intelligence',
        title: 'Smart Insights',
        size: 'lg',
        position: { x: 2, y: 2, w: 1, h: 3 },
        visible: true,
        configurable: true,
        removable: true,
        config: {
          maxRecommendations: 3,
          maxPriorityItems: 5,
          showPriority: true
        }
      }
    ];

    const layout: DashboardLayout = {
      id: `default-${userId}`,
      userId,
      role: UserRole.PLAYER, // This would come from user context
      name: 'My Dashboard',
      isDefault: true,
      widgets: defaultWidgets,
      columns: 12,
      spacing: 'comfortable',
      theme: {
        mode: 'light',
        colorScheme: 'default',
        animations: 'full'
      },
      lastModified: now
    };

    const preferences: DashboardPreferences = {
      userId,
      defaultLayout: layout.id,
      autoSave: true,
      refreshInterval: 300, // 5 minutes
      notifications: {
        dataUpdates: true,
        systemAlerts: true,
        achievements: true
      },
      shortcuts: []
    };

    return { layout, preferences };
  }

  // Legacy methods (keeping for backward compatibility)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD.STATS);
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      return {
        upcomingMatches: 2,
        totalTournaments: 8,
        totalParticipants: 0,
        winRate: 68.5,
        matchesWon: 23,
        matchesPlayed: 35,
      };
    }
  }

  async getMonthlyStats(year: number): Promise<MonthlyStats[]> {
    try {
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.MONTHLY_STATS}?year=${year}`);
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((month) => ({
        month,
        wins: Math.floor(Math.random() * 8) + 1,
        losses: Math.floor(Math.random() * 5) + 1,
        tournaments: Math.floor(Math.random() * 3) + 1,
      }));
    }
  }

  async getNextTournament(): Promise<NextTournament | null> {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD.NEXT_TOURNAMENT);
      return response.data.next_tournament;
    } catch (error) {
      console.warn('Next tournament endpoint not available, using fallback');
      // Return null instead of mock data to avoid confusion
      return null;
    }
  }

  async getPlayerProfile(): Promise<PlayerProfile | null> {
    try {
      // Use the user profile endpoint instead of dashboard profile endpoint
      // This ensures we get the most up-to-date profile data
      const response = await api.get(API_ENDPOINTS.USERS.ME);
      console.log('User profile response for dashboard:', response.data);
      
      const userProfile = response.data.profile;
      if (userProfile) {
        // Transform user profile data to match PlayerProfile interface
        return {
          id: userProfile.id,
          name: userProfile.full_name,
          country: userProfile.country,
          age: userProfile.date_of_birth ? this.calculateAge(userProfile.date_of_birth) : 0,
          birthDate: userProfile.date_of_birth,
          gender: userProfile.gender,
          wtaRanking: userProfile.wtaRanking,
          atpRanking: userProfile.atpRanking,
          bio: userProfile.bio || '',
          profilePicture: userProfile.profile_picture,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile for dashboard:', error);
      // Return null if API fails - will show "complete profile" message
      return null;
    }
  }

  private calculateAge(dateString: string): number {
    try {
      const birthDate = new Date(dateString);
      if (isNaN(birthDate.getTime())) return 0;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return 0;
    }
  }

  async updatePlayerStats(matchResult: 'win' | 'loss'): Promise<void> {
    try {
      await api.post(API_ENDPOINTS.DASHBOARD.UPDATE_STATS, { result: matchResult });
    } catch (error) {
      console.error('Failed to update player stats:', error);
    }
  }
}

export const dashboardService = new DashboardService();