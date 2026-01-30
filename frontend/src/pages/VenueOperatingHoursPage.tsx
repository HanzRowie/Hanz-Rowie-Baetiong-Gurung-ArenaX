import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Save,
  AlertTriangle, 
  CheckCircle,
  X
} from 'lucide-react';
import { venueService } from '@/services/venueService';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import toastService from '@/services/toastService';

interface VenueSettings {
  default_opening_time: string;
  default_closing_time: string;
  operating_days: number[];
  is_active: boolean;
}

export const VenueOperatingHoursPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [settings, setSettings] = useState<VenueSettings>({
    default_opening_time: '06:00',
    default_closing_time: '22:00',
    operating_days: [1, 2, 3, 4, 5, 6, 7], // All days by default
    is_active: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user's venues
  const { data: venuesData, isLoading: venuesLoading } = useQuery({
    queryKey: ['venues', 'my-venues'],
    queryFn: () => venueService.getMyVenues(),
    enabled: !!user,
  });

  const venues = venuesData?.venues || [];

  // Update venue settings
  const updateVenueSettings = useMutation({
    mutationFn: (data: { venueId: string; settings: Partial<VenueSettings> }) =>
      venueService.updateVenueSettings(data.venueId, data.settings),
    onSuccess: () => {
      toastService.success('Venue settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toastService.error(error.message || 'Failed to update venue settings');
    },
  });

  // Set first venue as selected by default and load its settings
  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenue) {
      const firstVenue = venues[0];
      setSelectedVenue(firstVenue.id);
      setSettings({
        default_opening_time: firstVenue.default_opening_time || '06:00',
        default_closing_time: firstVenue.default_closing_time || '22:00',
        operating_days: firstVenue.operating_days || [1, 2, 3, 4, 5, 6, 7],
        is_active: firstVenue.is_active ?? true,
      });
    }
  }, [venues, selectedVenue]);

  // Load settings when venue changes
  useEffect(() => {
    if (selectedVenue && venues) {
      const venue = venues.find((v: any) => v.id === selectedVenue);
      if (venue) {
        setSettings({
          default_opening_time: venue.default_opening_time || '06:00',
          default_closing_time: venue.default_closing_time || '22:00',
          operating_days: venue.operating_days || [1, 2, 3, 4, 5, 6, 7],
          is_active: venue.is_active ?? true,
        });
        setHasChanges(false);
      }
    }
  }, [selectedVenue, venues]);

  const selectedVenueData = venues?.find((v: any) => v.id === selectedVenue);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSettingChange = (field: keyof VenueSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleDayToggle = (dayNumber: number) => {
    const newDays = settings.operating_days.includes(dayNumber)
      ? settings.operating_days.filter(d => d !== dayNumber)
      : [...settings.operating_days, dayNumber].sort();
    
    handleSettingChange('operating_days', newDays);
  };

  const handleSave = () => {
    if (!selectedVenue) return;
    
    updateVenueSettings.mutate({
      venueId: selectedVenue,
      settings,
    });
  };

  const handleReset = () => {
    if (selectedVenueData) {
      setSettings({
        default_opening_time: selectedVenueData.default_opening_time || '06:00',
        default_closing_time: selectedVenueData.default_closing_time || '22:00',
        operating_days: selectedVenueData.operating_days || [1, 2, 3, 4, 5, 6, 7],
        is_active: selectedVenueData.is_active ?? true,
      });
      setHasChanges(false);
    }
  };

  if (venuesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-600">
              You need to create a venue first before managing operating hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Operating Hours</h1>
            <p className="text-gray-600 mt-1">
              Set your venue's operating days and hours
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4 inline mr-2" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={updateVenueSettings.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Venue Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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

        {selectedVenueData && (
          <div className="space-y-6">
            {/* Venue Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Venue Status</h3>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${settings.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-gray-900">
                      {settings.is_active ? 'Active and accepting bookings' : 'Inactive - not accepting bookings'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {settings.is_active 
                        ? 'Customers can book your venue during operating hours'
                        : 'Your venue is temporarily closed for bookings'
                      }
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.is_active}
                    onChange={(e) => handleSettingChange('is_active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {!settings.is_active && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Your venue is currently inactive. Customers cannot make new bookings.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Operating Hours */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Operating Hours</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={settings.default_opening_time}
                    onChange={(e) => handleSettingChange('default_opening_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={settings.default_closing_time}
                    onChange={(e) => handleSettingChange('default_closing_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                These are your default operating hours. You can override them for specific dates if needed.
              </p>
            </div>

            {/* Operating Days */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Days</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dayNames.map((day, index) => {
                  const dayNumber = index + 1;
                  const isSelected = settings.operating_days.includes(dayNumber);
                  
                  return (
                    <label
                      key={day}
                      className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleDayToggle(dayNumber)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="font-medium">{day}</div>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 mx-auto mt-1 text-blue-500" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                Select the days when your venue is open for bookings. 
                {settings.operating_days.length === 0 && (
                  <span className="text-red-600 font-medium"> You must select at least one day.</span>
                )}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={settings.is_active ? 'text-green-600' : 'text-red-600'}>
                    {settings.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Operating Hours:</span>{' '}
                  {settings.default_opening_time} - {settings.default_closing_time}
                </p>
                <p>
                  <span className="font-medium">Operating Days:</span>{' '}
                  {settings.operating_days.length > 0 
                    ? settings.operating_days.map(d => dayNames[d - 1]).join(', ')
                    : 'None selected'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueOperatingHoursPage;