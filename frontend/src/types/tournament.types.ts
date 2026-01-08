export interface Tournament {
  id: string;
  title: string;
  description: string;
  sport_type: string;
  tournament_type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
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
  matches?: Match[];
  created_at: string;
  updated_at?: string;
  // Enhanced bracket data
  bracket?: TournamentBracket;
  current_round?: number;
  total_rounds?: number;
  completion_percentage?: number;
  winner?: Player;
  final_standings?: Player[];
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
  winner?: {
    id: string;
    name: string;
  };
  player1_score?: number;
  player2_score?: number;
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
}

export interface TournamentBracket {
  id: string;
  tournament: string;
  bracket_type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
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
  status?: string;
  location?: string;
  entry_fee_max?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
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