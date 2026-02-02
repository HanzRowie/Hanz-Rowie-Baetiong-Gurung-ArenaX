// Team-related TypeScript types and interfaces

export type SportType = 'FUTSAL' | 'BADMINTON';

export type TeamRole = 'OWNER' | 'LEADER' | 'MEMBER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface TeamUser {
  id: string;
  full_name: string;
  email: string;
}

export interface TeamMembership {
  id: string;
  player: TeamUser;
  role: TeamRole;
  joined_at: string;
  is_active: boolean;
}

export interface TournamentHistoryEntry {
  id: string;
  name: string;
  sport_type: SportType;
  start_date: string;
  end_date: string;
  status: string;
  placement?: number;
  total_teams?: number;
}

export interface RecentActivityEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: TeamUser;
}

export interface Team {
  id: string;
  name: string;
  sport_types: SportType[];
  owner: TeamUser;
  created_at: string;
  updated_at: string;
  max_size: number;
  is_active: boolean;
  memberships: TeamMembership[];
  member_count: number;
  is_full: boolean;
  // Statistics and performance data
  tournament_count?: number;
  wins?: number;
  rating?: number;
  // Tournament and activity history
  tournament_history?: TournamentHistoryEntry[];
  recent_activity?: RecentActivityEntry[];
}

export interface TeamCreateRequest {
  name: string;
  sport_types: SportType[];
  max_size?: number;
}

export interface TeamUpdateRequest {
  name?: string;
  sport_types?: SportType[];
  max_size?: number;
}

export interface Invitation {
  id: string;
  team: Team;
  player: TeamUser;
  sender: TeamUser;
  status: InvitationStatus;
  sent_at: string;
  responded_at?: string;
  expires_at: string;
}

export interface InvitationCreateRequest {
  player_email: string;
}

export interface InvitationResponse {
  response: 'ACCEPTED' | 'DECLINED';
}

export interface TeamMemberAddRequest {
  player_id: string;
}

export interface TeamMemberRoleUpdateRequest {
  role: TeamRole;
}

export interface OwnershipTransferRequest {
  new_owner_id: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    count: number;
    next: string | null;
    previous: string | null;
    page_size: number;
    current_page: number;
    total_pages: number;
  };
}

// Analytics and Activity History types
export type ActivityEventType = 
  | 'TEAM_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'TOURNAMENT_REGISTERED'
  | 'MATCH_PLAYED'
  | 'OWNERSHIP_TRANSFERRED';

export interface ActivityHistory {
  id: string;
  event_type: ActivityEventType;
  description: string;
  performed_by?: TeamUser;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ActivityStatistics {
  team_id: string;
  team_name: string;
  total_activities: number;
  first_activity?: {
    timestamp: string;
    event_type: ActivityEventType;
    description: string;
  };
  last_activity?: {
    timestamp: string;
    event_type: ActivityEventType;
    description: string;
  };
  event_type_breakdown: Record<ActivityEventType, number>;
  monthly_activity_trend: Record<string, number>;
  most_active_users: Array<{
    id: string;
    name: string;
    activity_count: number;
  }>;
}

export interface ActivitySummary {
  team_id: string;
  team_name: string;
  period_days: number;
  total_activities: number;
  event_type_counts: Record<ActivityEventType, number>;
  most_active_user?: {
    id: string;
    name: string;
    activity_count: number;
  };
  generated_at: string;
}

export interface TeamAnalyticsData {
  statistics: ActivityStatistics;
  summary: ActivitySummary;
  recentActivity: ActivityHistory[];
}