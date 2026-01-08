export interface Venue {
  id: string;
  owner: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    profile_picture?: string;
  };
  name: string;
  description?: string;
  location: string;
  address: string;
  capacity: number;
  price_per_hour: number;
  images?: string[];
  amenities: string[];
  sport_types: string[];
  availability: VenueAvailability[];
  rating?: number;
  total_bookings?: number;
  created_at: string;
  updated_at?: string;
}

export interface VenueAvailability {
  id: string;
  venue: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price_override?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VenueBooking {
  id: string;
  venue: Venue;
  booker: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
  };
  booking_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_cost: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  purpose: string;
  notes?: string;
  payment_status?: 'PENDING' | 'PAID' | 'REFUNDED';
  created_at: string;
  updated_at?: string;
}

export interface VenueReview {
  id: string;
  venue: string;
  reviewer: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  rating: number;
  comment?: string;
  booking?: string;
  created_at: string;
  updated_at?: string;
}

export interface VenueStats {
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  occupancy_rate: number;
  monthly_stats: Array<{
    month: string;
    bookings: number;
    revenue: number;
    occupancy_rate: number;
  }>;
  popular_time_slots: Array<{
    time_slot: string;
    booking_count: number;
  }>;
  sport_type_breakdown: Record<string, number>;
}

export interface CreateVenueData {
  name: string;
  description?: string;
  location: string;
  address: string;
  capacity: number;
  price_per_hour: number;
  amenities: string[];
  sport_types: string[];
  images?: File[];
}

export interface VenueFilters {
  location?: string;
  sport_type?: string;
  capacity_min?: number;
  capacity_max?: number;
  price_min?: number;
  price_max?: number;
  available_date?: string;
  amenities?: string[];
  rating_min?: number;
  search?: string;
}

export interface BookingRequest {
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  notes?: string;
}

export interface VenueSearchResult {
  venues: Venue[];
  total: number;
  filters_applied: VenueFilters;
  available_amenities: string[];
  price_range: {
    min: number;
    max: number;
  };
  locations: string[];
}