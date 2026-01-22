import { api } from './api';
import type { RefereeAvailability, RefereeBooking, AvailableReferee } from '../types/user.types';

// Referee Availability Management
export const getRefereeAvailability = async (): Promise<RefereeAvailability[]> => {
  const response = await api.get('/referees/availability');
  return response.data;
};

export const createRefereeAvailability = async (availability: Partial<RefereeAvailability>): Promise<RefereeAvailability> => {
  const response = await api.post('/referees/availability', availability);
  return response.data;
};

export const updateRefereeAvailability = async (availabilityId: string, availability: Partial<RefereeAvailability>): Promise<RefereeAvailability> => {
  const response = await api.put(`/referees/availability/${availabilityId}`, availability);
  return response.data;
};

export const deleteRefereeAvailability = async (availabilityId: string): Promise<void> => {
  await api.delete(`/referees/availability/${availabilityId}`);
};

// Find Available Referees (Organizers)
export const findAvailableReferees = async (date: string): Promise<{ referees: AvailableReferee[] }> => {
  const response = await api.get('/referees/find-available', { params: { date } });
  return response.data;
};

// Referee Booking Management (Organizers)
export const requestRefereeBooking = async (matchId: string, refereeId: string, notes?: string): Promise<RefereeBooking> => {
  const response = await api.post('/referees/booking/request', { match_id: matchId, referee_id: refereeId, notes });
  return response.data;
};

export const getOrganizerBookingRequests = async (): Promise<RefereeBooking[]> => {
  const response = await api.get('/referees/booking/organizer');
  return response.data;
};

// Referee Booking Responses (Referees)
export const getRefereeBookingRequests = async (): Promise<RefereeBooking[]> => {
  const response = await api.get('/referees/booking/my');
  return response.data;
};

export const respondToBookingRequest = async (bookingId: string, action: 'accept' | 'decline'): Promise<RefereeBooking> => {
  const response = await api.put(`/referees/booking/${bookingId}/respond`, { action });
  return response.data;
};
