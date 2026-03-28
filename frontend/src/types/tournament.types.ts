export interface Tournament {
  id: string;
  title: string;
  description: string;
  sport_type: string;
  tournament_type: 'SINGLE_ELIMINATION' | 'knockout' | 'league'; // Tournament format types
  participation_type: 'INDIVIDUAL' | 'TEAM'; // New field for team-based tournaments
  date: string;
  start_time: string;
  end_time?: string;
  venue: string;
  venue_address: string;
  entry_fee: string;
  max_participants: number;
  min_participants: number;
  registered_count: number;
  registration_deadline: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  prize_pool?: string;
  rules: string;
  tournament_image?: string;
  organizer: {
    id: string;
    name: string;
    profile_picture?: string;
    email?: string;
  };
  is_registration_open: boolean;
  user_registration_status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | null;
  registered_players?: Player[];
  registered_teams?: TeamRegistration[]; // New field for team registrations
  matches?: Match[];
  created_at: string;
  updated_at?: string;
  share_token?: string;
  // Enhanced bracket data
  bracket?: TournamentBracket;
  current_round?: number;
  total_rounds?: number;
  completion_percentage?: number;
  winner?: Player | TeamRegistration; // Can be either player or team
  final_standings?: (Player | TeamRegistration)[];
  // Team-specific settings
  team_size_min?: number;
  team_size_max?: number;
  allow_mixed_teams?: boolean;
}

export interface Player {
  id: string;
  name: string;
  profile_picture?: string;
  skill_level?: string;
  registered_at?: string;
  // Enhanced player data
  seed?: number;
  wins?: number;
  losses?: number;
  points?: number;
  eliminated?: boolean;
}

export interface Match {
  id: string;
  round_number: number;
  match_number: number;
  player1?: Player;
  player2?: Player;
  team1?: TeamRegistration; // New field for team matches
  team2?: TeamRegistration; // New field for team matches
  winner?: {
    id: string;
    name: string;
    type: 'PLAYER' | 'TEAM'; // Specify if winner is player or team
  };
  player1_score?: number;
  player2_score?: number;
  team1_score?: number; // New field for team scores
  team2_score?: number; // New field for team scores
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduled_time?: string;
  // Enhanced match data
  bracket_position?: {
    round: number;
    position: number;
  };
  next_match_id?: string;
  previous_match_ids?: string[];
  referee?: {
    id: string;
    name: string;
  };
  venue_details?: {
    court?: string;
    location?: string;
  };
  match_duration?: number;
  notes?: string;
  // Sport-specific scoring
  futsal_score?: FutsalMatchScore;
  badminton_sets?: BadmintonSet[];
}

export interface TournamentBracket {
  id: string;
  tournament: string;
  bracket_type: 'SINGLE_ELIMINATION'; // Only single elimination supported
  rounds: BracketRound[];
  created_at: string;
  updated_at?: string;
}

export interface BracketRound {
  round_number: number;
  matches: Match[];
  is_completed: boolean;
  start_date?: string;
  end_date?: string;
}

export interface TournamentRegistration {
  id: string;
  tournament: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  registered_at: string;
  notes?: string;
  payment_status?: 'PENDING' | 'PAID' | 'REFUNDED';
}

export interface TournamentStats {
  total_matches: number;
  completed_matches: number;
  pending_matches: number;
  total_registrations: number;
  accepted_registrations: number;
  pending_registrations: number;
  completion_percentage: number;
  average_match_duration?: number;
  most_active_players?: Player[];
  revenue_generated?: number;
}

export interface TournamentFilters {
  sport_type?: string;
  tournament_type?: string;
  registration_type?: 'INDIVIDUAL' | 'TEAM';
  participation_type?: 'INDIVIDUAL' | 'TEAM';
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

export interface TournamentSearchResult {
  tournaments: Tournament[];
  total: number;
  filters_applied: TournamentFilters;
  available_sports: string[];
  locations: string[];
  date_range: {
    earliest: string;
    latest: string;
  };
}

// Team-related types for tournaments
export interface TeamRegistration {
  id: string;
  team: {
    id: string;
    name: string;
    sport_types: string[];
    owner: {
      id: string;
      full_name: string;
      profile_picture?: string;
    };
    member_count: number;
    max_size: number;
  };
  tournament: string;
  selected_players: Player[];
  registered_by: {
    id: string;
    full_name: string;
    profile_picture?: string;
  };
  registered_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

// Sport-specific scoring types
export interface FutsalMatchScore {
  id: string;
  match: string;
  team1_goals: number;
  team2_goals: number;
  team1_stats: FutsalPlayerStat[];
  team2_stats: FutsalPlayerStat[];
  created_at: string;
}

export interface FutsalPlayerStat {
  id: string;
  player: {
    id: string;
    full_name: string;
    profile_picture?: string;
  };
  goals: number;
  assists: number;
  minutes_played: number;
}

export interface BadmintonSet {
  id: string;
  set_number: number;
  home_score: number;
  away_score: number;
  duration: number; // in minutes
  winner: 'home' | 'away';
}

// Enhanced tournament filters for team tournaments
export interface TournamentFilters {
  sport_type?: string;
  tournament_type?: string;
  participation_type?: 'INDIVIDUAL' | 'TEAM';
  status?: string;
  location?: string;
  entry_fee_max?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  team_size_min?: number;
  team_size_max?: number;
}