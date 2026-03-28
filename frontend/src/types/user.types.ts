export interface ExtendedUserProfile {
  id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  role: 'PLAYER' | 'ORGANIZER' | 'REFEREE' | 'VENUE_OWNER';
  bio: string;
  location: string;
  country?: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  preferred_sports: string[];
  skill_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  achievements: string;
  social_links: Record<string, string>;
  is_available_for_matches: boolean;
  profile_picture?: string;
  date_joined: string;
  is_verified: boolean;

  // Player-specific stats
  tournaments_participated?: number;
  matches_played?: number;
  matches_won?: number;
  win_rate?: number;

  // Organizer-specific stats
  tournaments_organized?: number;
  total_participants?: number;

  // Venue Owner fields
  business_name?: string;
  business_registration?: string;
  business_contact?: string;

  // Referee-specific fields
  referee_profile?: {
    certification_level: string;
    sports_specialization: string[];
    years_experience: number;
    license_number?: string;
    license_expiry?: string;
    is_verified: boolean;
    rating: number;
    total_matches_officiated: number;
  };
  
  // Referee booking stats
  total_bookings?: number;
  accepted_bookings?: number;
  completed_bookings?: number;

  // Enhanced matching fields (for player search results)
  match_score?: number;
  match_reasons?: string[];
}

export interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    date: string;
  };
  round_number: number;
  match_number: number;
  opponent?: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  my_score?: number;
  opponent_score?: number;
  result: 'won' | 'lost' | 'pending';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduled_time?: string;
}

export interface RefereeAvailability {
  id: string;
  referee: string;
  available_date: string;
  start_time?: string;
  end_time?: string;
  status: 'available' | 'booked';
}

export interface RefereeBooking {
  id: string;
  referee: string;
  referee_name: string;
  match: string;
  match_details: string;
  tournament_title: string;
  requested_by: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  requested_at: string;
  responded_at?: string;
  notes: string;
}

export interface AvailableReferee {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  available_date: string;
  start_time?: string;
  end_time?: string;
  profile_picture?: string;
}
