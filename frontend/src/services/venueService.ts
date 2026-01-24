import api from './api';
import type { VenueStats } from '../types/venue.types';

export interface Venue {
  id: string;
  owner: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
  };
  name: string;
  description?: string;
  location: string;
  address: string;
  court_size?: string;
  capacity: number;
  price_per_hour: number;
  images?: string[];
  amenities: string[];
  sport_types: string[];
  availability: VenueAvailability[];
  image?: string;
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
}

export interface VenueBooking {
  id: string;
  venue: Venue;
  booker: {
    id: string;
    name: string;
    email?: string;
  };
  booking_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_cost: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  purpose: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateVenueData {
  name: string;
  description?: string;
  location: string;
  address: string;
  court_size?: string;
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

class VenueService {
  // Venue CRUD operations
  async createVenue(data: CreateVenueData & { court_size?: string }): Promise<{ venue: Venue; message: string }> {
    const formData = new FormData();

    // Map frontend fields to backend model fields
    formData.append('name', data.name);
    formData.append('location', data.location);
    formData.append('capacity', data.capacity.toString());
    formData.append('price_per_hour', data.price_per_hour.toString());

    // Optional fields
    if (data.description) {
      formData.append('facilities', data.description); // Backend uses 'facilities'
    }

    if (data.court_size) {
      formData.append('court_size', data.court_size);
    }

    if (data.sport_types && data.sport_types.length > 0) {
      formData.append('sport_type', data.sport_types[0]); // Backend uses single 'sport_type'
    }

    if (data.images && data.images.length > 0) {
      formData.append('image', data.images[0]); // Backend uses single 'image'
    }

    const response = await api.post('/api/venues/venues/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { venue: response.data, message: 'Venue created successfully' };
  }

  async getVenues(filters?: VenueFilters): Promise<{ venues: Venue[]; count: number }> {
    const params = new URLSearchParams();

    if (filters?.location) params.append('location', filters.location);
    if (filters?.sport_type) params.append('sport_type', filters.sport_type);
    if (filters?.capacity_min) params.append('capacity_min', filters.capacity_min.toString());
    if (filters?.capacity_max) params.append('capacity_max', filters.capacity_max.toString());
    if (filters?.price_min) params.append('price_min', filters.price_min.toString());
    if (filters?.price_max) params.append('price_max', filters.price_max.toString());
    if (filters?.available_date) params.append('available_date', filters.available_date);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/api/venues/venues/?${params.toString()}`);
    return response.data;
  }

  async getVenueDetail(venueId: string): Promise<{ venue: Venue }> {
    const response = await api.get(`/api/venues/venues/${venueId}/`);
    return { venue: response.data };
  }

  async updateVenue(venueId: string, data: Partial<CreateVenueData> & { court_size?: string }): Promise<{ venue: Venue; message: string }> {
    const formData = new FormData();

    if (data.name) formData.append('name', data.name);
    if (data.location) formData.append('location', data.location);
    if (data.capacity) formData.append('capacity', data.capacity.toString());
    if (data.price_per_hour) formData.append('price_per_hour', data.price_per_hour.toString());
    if (data.description !== undefined) formData.append('facilities', data.description || '');
    if (data.court_size !== undefined) formData.append('court_size', data.court_size || 'Standard');

    if (data.sport_types && data.sport_types.length > 0) {
      formData.append('sport_type', data.sport_types[0]);
    }

    if (data.images && data.images.length > 0) {
      formData.append('image', data.images[0]);
    }

    const response = await api.put(`/api/venues/venues/${venueId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { venue: response.data, message: 'Venue updated successfully' };
  }

  async deleteVenue(venueId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/venues/venues/${venueId}/`);
    return response.data;
  }

  // Venue search and filtering
  async searchVenues(query: string, filters?: VenueFilters): Promise<{ venues: Venue[]; count: number }> {
    const searchFilters = { ...filters, search: query };
    return this.getVenues(searchFilters);
  }

  async getVenuesByLocation(location: string): Promise<{ venues: Venue[]; count: number }> {
    return this.getVenues({ location });
  }

  async getVenuesBySport(sportType: string): Promise<{ venues: Venue[]; count: number }> {
    return this.getVenues({ sport_type: sportType });
  }

  // Venue availability management
  async setVenueAvailability(
    venueId: string,
    availability: Omit<VenueAvailability, 'id' | 'venue'>[]
  ): Promise<{ availability: VenueAvailability[]; message: string }> {
    const response = await api.post(`/api/venues/venues/${venueId}/availability/`, { availability });
    return response.data;
  }

  async createAvailabilitySlot(
    data: { venue: string; date: string; start_time: string; end_time: string; is_available: boolean }
  ): Promise<{ availability: VenueAvailability; message: string }> {
    const response = await api.post('/api/availabilities/', data);
    return response.data;
  }

  async getVenueAvailability(venueId: string, date?: string): Promise<{ availability: VenueAvailability[] }> {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/api/venues/venues/${venueId}/availability/${params}`);
    return response.data;
  }

  async updateAvailabilitySlot(
    availabilityId: string,
    data: Partial<VenueAvailability>
  ): Promise<{ availability: VenueAvailability; message: string }> {
    const response = await api.put(`/api/availabilities/${availabilityId}/`, data);
    return response.data;
  }

  async deleteAvailabilitySlot(availabilityId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/availabilities/${availabilityId}/`);
    return response.data;
  }

  // Booking request and management
  async createBookingRequest(data: BookingRequest): Promise<{ booking: VenueBooking; message: string }> {
    // Map booking_date to date for backend compatibility
    const requestData = {
      venue_id: data.venue_id,
      date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      purpose: data.purpose,
      notes: data.notes || ''
    };

    console.log('Sending booking request:', requestData);

    const response = await api.post(`/api/venues/venues/${data.venue_id}/book/`, requestData);
    return response.data;
  }

  async getBookingRequests(venueId?: string): Promise<{ bookings: VenueBooking[] }> {
    const params = venueId ? `?venue_id=${venueId}` : '';
    const response = await api.get(`/api/venues/my-bookings/${params}`);
    return { bookings: response.data.bookings || response.data };
  }

  async getMyBookings(): Promise<{ bookings: VenueBooking[] }> {
    const response = await api.get('/api/venues/my-bookings/');
    return { bookings: response.data.bookings || response.data };
  }

  async respondToBookingRequest(
    bookingId: string,
    action: 'confirm' | 'cancel',
    notes?: string
  ): Promise<{ booking: VenueBooking; message: string }> {
    const endpoint = action === 'confirm' ? 'approve' : 'reject';
    const response = await api.post(`/api/venues/bookings/${bookingId}/${endpoint}/`, { notes });
    return response.data;
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<{ message: string }> {
    const response = await api.post(`/api/venues/bookings/${bookingId}/cancel/`, { reason });
    return response.data;
  }

  async getBookingHistory(venueId?: string): Promise<{ bookings: VenueBooking[]; revenue_stats?: any }> {
    const params = venueId ? `?venue_id=${venueId}` : '';
    const response = await api.get(`/venue-bookings/history${params}`);
    return response.data;
  }

  // Venue owner specific methods
  async getMyVenues(): Promise<{ venues: Venue[] }> {
    const response = await api.get('/api/venues/my-venues/');
    return { venues: response.data.venues || response.data };
  }

  async getVenueStats(venueId: string): Promise<VenueStats> {
    const response = await api.get(`/api/venues/venues/${venueId}/stats/`);
    return response.data;
  }

  async getVenueReviews(venueId: string): Promise<{ reviews: any[] }> {
    const response = await api.get(`/api/venues/venues/${venueId}/reviews/`);
    return response.data;
  }

  // Tournament venue selection
  async getAvailableVenuesForTournament(params: {
    date: string;
    start_time: string;
    end_time: string;
    sport_type?: string;
  }): Promise<{ venues: Venue[]; count: number }> {
    const searchParams = new URLSearchParams();
    searchParams.append('date', params.date);
    searchParams.append('start_time', params.start_time);
    searchParams.append('end_time', params.end_time);
    if (params.sport_type) {
      searchParams.append('sport_type', params.sport_type);
    }

    console.log('Making venue request with params:', params);
    console.log('URL:', `/api/venues/available-venues/?${searchParams.toString()}`);

    const response = await api.get(`/api/venues/available-venues/?${searchParams.toString()}`);
    console.log('Venue response:', response.data);
    return response.data;
  }
}

export const venueService = new VenueService();