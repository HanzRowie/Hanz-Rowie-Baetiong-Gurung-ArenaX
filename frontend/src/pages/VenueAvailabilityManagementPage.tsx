import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  CheckCircle
} from 'lucide-react';
import { venueService } from '@/services/venueService';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';

export const VenueAvailabilityManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');

  // Fetch user's venues
  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['venues', 'my-venues'],
    queryFn: () => venueService.getMyVenues(),
    enabled: !!user,
  });

  const venues = venuesData?.venues || [];

  // Set first venue as selected by default
  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0].id);
    }
  }, [venues, selectedVenue]);

  const selectedVenueData = venues?.find((v: any) => v.id === selectedVenue);

  if (venuesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-600">
              You need to create a venue first before managing availability.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Venue Availability</h1>
            <p className="text-gray-600 mt-1">
              Manage your venue's operating hours and availability
            </p>
          </div>
        </div>

        {/* Venue Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Venue
              </label>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {venues.map((venue: any) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} - {venue.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {selectedVenueData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Venue Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Venue Status</h3>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sport Type:</span>
                  <span className="font-medium">{selectedVenueData.sport_types?.[0] || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{selectedVenueData.capacity} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per Hour:</span>
                  <span className="font-medium">Rs. {selectedVenueData.price_per_hour}</span>
                </div>
              </div>
            </div>

            {/* Daily Availability */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Availability - {new Date(selectedDate).toLocaleDateString()}
                </h3>
              </div>

              <div className="text-center py-6 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Availability management coming soon</p>
                <p className="text-sm">
                  Currently using default operating hours
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Management */}
        {selectedVenue && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking Management</h3>
            </div>

            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No bookings for selected date</p>
              <p className="text-sm">Bookings will appear here when customers make reservations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueAvailabilityManagementPage;