import type { Tournament } from './tournament.types';
import type { ExtendedUserProfile } from './user.types';
import type { Venue } from './venue.types';

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface GlobalSearchResult {
  tournaments: SearchResult<Tournament>;
  players: SearchResult<ExtendedUserProfile>;
  venues: SearchResult<Venue>;
  total_results: number;
  search_time: number;
  suggestions?: string[];
}

export interface SearchFilters {
  query?: string;
  category?: 'all' | 'tournaments' | 'players' | 'venues';
  location?: string;
  sport_type?: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
  skill_level?: string;
  availability?: boolean;
  sort_by?: 'relevance' | 'date' | 'price' | 'rating' | 'distance';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface FilterOptions {
  locations: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  sports: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  skill_levels: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  price_ranges: Array<{
    min: number;
    max: number;
    label: string;
    count: number;
  }>;
  date_ranges: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

export interface SearchPreference {
  id: string;
  user: string;
  name: string;
  filters: SearchFilters;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SearchHistory {
  id: string;
  user: string;
  query: string;
  filters: SearchFilters;
  results_count: number;
  clicked_result?: {
    type: string;
    id: string;
    title: string;
  };
  searched_at: string;
}

export interface AutocompleteResult {
  suggestions: Array<{
    text: string;
    type: 'query' | 'tournament' | 'player' | 'venue' | 'location' | 'sport';
    highlight?: string;
    metadata?: any;
  }>;
  recent_searches: string[];
  popular_searches: string[];
}

export interface SearchAnalytics {
  total_searches: number;
  popular_queries: Array<{
    query: string;
    count: number;
  }>;
  popular_filters: Array<{
    filter: string;
    value: string;
    count: number;
  }>;
  search_trends: Array<{
    date: string;
    searches: number;
  }>;
  conversion_rate: number;
  average_results_per_search: number;
}

// Tournament-specific search types
export interface TournamentSearchFilters extends SearchFilters {
  tournament_type?: string;
  status?: string;
  entry_fee_max?: number;
  organizer?: string;
  has_prizes?: boolean;
  registration_open?: boolean;
}

// Player-specific search types
export interface PlayerSearchFilters extends SearchFilters {
  role?: 'PLAYER' | 'ORGANIZER' | 'REFEREE' | 'VENUE_OWNER';
  is_available?: boolean;
  has_profile_picture?: boolean;
  min_tournaments?: number;
  win_rate_min?: number;
}

// Venue-specific search types
export interface VenueSearchFilters extends SearchFilters {
  capacity_min?: number;
  capacity_max?: number;
  amenities?: string[];
  rating_min?: number;
  has_images?: boolean;
  available_date?: string;
  available_time?: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: GlobalSearchResult | null;
  loading: boolean;
  error: string | null;
  suggestions: AutocompleteResult | null;
  history: SearchHistory[];
  preferences: SearchPreference[];
  selected_preference?: SearchPreference;
}