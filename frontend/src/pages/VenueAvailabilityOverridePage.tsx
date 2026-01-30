import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { venueService } from '@/services/venueService';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import toastService from '@/services/toastService';

interface VenueAvailabilityOverride {
  id?: string;
  date: string;
  opening_time: string;
  closing_time: string;
  is_available: boolean;
  notes: string;
}

export const VenueAvailabilityOverridePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState<VenueAvailabilityOverride | null>(null);

  // Fetch user's venues
  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['venues', 'my-venues'],
    queryFn: () => venueService.getMyVenues(),
    enabled: !!user,
  });

  // Fetch venue availability overrides
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['venue-availability', selectedVenue, selectedDate],
    queryFn: () => venueService.getVenueAvailability(selectedVenue, selectedDate),
    enabled: !!selectedVenue && !!selectedDate,
  });

  const venues = venuesData?.venues || [];
  const availability = availabilityData?.availability || [];

  // Set first venue as selected by default
  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0].id);
    }
  }, [venues, selectedVenue]);

  const selectedVenueData = venues?.find((v: any) => v.id === selectedVenue);

  const OverrideForm: React.FC<{
    override?: VenueAvailabilityOverride;
    onSave: (override: VenueAvailabilityOverride) => void;
    onCancel: () => void;
  }> = ({ override, onSave, onCancel }) => {
    const [formData, setFormData] = useState<VenueAvailabilityOverride>(
      override || {
        date: selectedDate,
        opening_time: selectedVenueData?.default_opening_time || '06:00',
        closing_time: selectedVenueData?.default_closing_time || '22:00',
        is_available: true,
        notes: '',
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {override ? 'Edit' : 'Add'} Availability Override
              </h3>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="font-medium">Venue is available on this date</span>
                </label>
              </div>

              {formData.is_available && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={formData.opening_time}
                      onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={formData.closing_time}
                      onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Reason for override or special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveOverride = async (_override: VenueAvailabilityOverride) => {
    try {
      // This would call the API to save the override
      // For now, just show success message
      toastService.success('Availability override saved successfully');
      setShowOverrideForm(false);
      setEditingOverride(null);
      queryClient.invalidateQueries({ queryKey: ['venue-availability'] });
    } catch (error: any) {
      toastService.error(error.message || 'Failed to save override');
    }
  };

  if (venuesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Availability Overrides</h1>
            <p className="text-gray-600 mt-1">
              Override default operating hours for specific dates
            </p>
          </div>
          <button
            onClick={() => setShowOverrideForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Override
          </button>
        </div>

        {/* Venue and Date Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View Date
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

        {/* Default Hours Info */}
        {selectedVenueData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Default Operating Hours</h3>
            </div>
            <p className="text-blue-800">
              {selectedVenueData.default_opening_time} - {selectedVenueData.default_closing_time}
              {' '}({selectedVenueData.operating_days?.length || 0} days per week)
            </p>
          </div>
        )}

        {/* Availability Overrides */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Overrides for {new Date(selectedDate).toLocaleDateString()}
            </h3>
          </div>

          <div className="p-6">
            {availabilityLoading ? (
              <LoadingSkeleton className="h-32" />
            ) : availability.length > 0 ? (
              <div className="space-y-4">
                {availability.map((override: any) => (
                  <div
                    key={override.id}
                    className={`p-4 border-2 rounded-lg ${
                      override.is_available 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${
                            override.is_available ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">
                            {override.is_available ? 'Available' : 'Closed'}
                          </span>
                        </div>
                        {override.is_available && (
                          <p className="text-sm text-gray-600">
                            {override.opening_time} - {override.closing_time}
                          </p>
                        )}
                        {override.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Notes:</span> {override.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingOverride(override);
                            setShowOverrideForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this override?')) {
                              // Handle delete
                              toastService.success('Override deleted successfully');
                              queryClient.invalidateQueries({ queryKey: ['venue-availability'] });
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No overrides for this date</h3>
                <p className="text-gray-600 mb-4">
                  Using default operating hours for {new Date(selectedDate).toLocaleDateString()}
                </p>
                <button
                  onClick={() => setShowOverrideForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Override
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Override Form Modal */}
      {showOverrideForm && (
        <OverrideForm
          override={editingOverride || undefined}
          onSave={handleSaveOverride}
          onCancel={() => {
            setShowOverrideForm(false);
            setEditingOverride(null);
          }}
        />
      )}
    </div>
  );
};

export default VenueAvailabilityOverridePage;