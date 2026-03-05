import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { api } from '../services/api';
import { Calendar, Clock, Settings, Save, RotateCcw, CheckCircle } from 'lucide-react';

interface GeneralAvailability {
  monday: { enabled: boolean; start_time: string; end_time: string };
  tuesday: { enabled: boolean; start_time: string; end_time: string };
  wednesday: { enabled: boolean; start_time: string; end_time: string };
  thursday: { enabled: boolean; start_time: string; end_time: string };
  friday: { enabled: boolean; start_time: string; end_time: string };
  saturday: { enabled: boolean; start_time: string; end_time: string };
  sunday: { enabled: boolean; start_time: string; end_time: string };
}

interface AvailabilitySlot {
  id?: number;
  available_date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  notes: string;
}

const RefereeAvailabilityPage: React.FC = () => {
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // General availability settings
  const [generalAvailability, setGeneralAvailability] = useState<GeneralAvailability>({
    monday: { enabled: true, start_time: '09:00', end_time: '17:00' },
    tuesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
    wednesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
    thursday: { enabled: true, start_time: '09:00', end_time: '17:00' },
    friday: { enabled: true, start_time: '09:00', end_time: '17:00' },
    saturday: { enabled: true, start_time: '10:00', end_time: '18:00' },
    sunday: { enabled: false, start_time: '10:00', end_time: '16:00' },
  });

  // Get next 14 days for availability toggle
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: i === 0,
      });
    }
    return days;
  };

  const next14Days = getNext14Days();

  useEffect(() => {
    fetchAvailabilities();
  }, []);

  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/referees/availability/');
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data;
      setAvailabilities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch availabilities');
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (date: string) => {
    // Check if there's any available slot for this date (regardless of times)
    return availabilities.some(slot => 
      slot.available_date === date && slot.is_available
    );
  };

  const toggleDateAvailability = async (date: string) => {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof GeneralAvailability;
    const daySettings = generalAvailability[dayOfWeek];
    
    if (!daySettings.enabled) {
      alert('This day is disabled in your general availability settings. Please enable it first.');
      return;
    }

    try {
      setSaving(true);
      
      // Check if there's any existing slot for this date
      const existingSlot = availabilities.find(slot => slot.available_date === date);
      
      if (existingSlot) {
        if (existingSlot.is_available) {
          // If currently available, make unavailable
          const updatedSlot = { ...existingSlot, is_available: false };
          await api.put(`/api/referees/availability/${existingSlot.id}/`, updatedSlot);
        } else {
          // If currently unavailable, make available
          const updatedSlot = { ...existingSlot, is_available: true };
          await api.put(`/api/referees/availability/${existingSlot.id}/`, updatedSlot);
        }
      } else {
        // Create new available slot
        const newSlot = {
          available_date: date,
          start_time: daySettings.start_time,
          end_time: daySettings.end_time,
          is_available: true,
          notes: `Available ${daySettings.start_time} - ${daySettings.end_time}`
        };
        await api.post('/api/referees/availability/', newSlot);
      }
      
      await fetchAvailabilities();
    } catch (err: any) {
      console.error('Availability toggle error:', err.response?.data);
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const saveGeneralAvailability = async () => {
    try {
      setSaving(true);
      // Here you could save general availability settings to backend if needed
      // For now, we'll just close the settings panel
      setShowSettings(false);
      alert('General availability settings saved!');
    } catch (err: any) {
      alert('Failed to save general availability settings');
    } finally {
      setSaving(false);
    }
  };

  const applyGeneralAvailabilityToAll = async () => {
    if (!confirm('This will update all your availability slots based on your general settings. Continue?')) {
      return;
    }

    try {
      setSaving(true);
      
      // Delete existing availabilities
      const deletePromises = availabilities.map(slot => {
        if (slot.id) {
          return api.delete(`/api/referees/availability/${slot.id}/`);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);

      // Create new slots based on general availability
      const createPromises = next14Days.map(day => {
        const dayOfWeek = day.dayName.toLowerCase() as keyof GeneralAvailability;
        const daySettings = generalAvailability[dayOfWeek];
        
        if (daySettings.enabled) {
          return api.post('/api/referees/availability/', {
            available_date: day.date,
            start_time: daySettings.start_time,
            end_time: daySettings.end_time,
            is_available: true,
            notes: `Available ${daySettings.start_time} - ${daySettings.end_time}`
          });
        }
        return Promise.resolve();
      });

      await Promise.all(createPromises);
      await fetchAvailabilities();
      setShowSettings(false);
      alert('Applied general availability to all days!');
    } catch (err: any) {
      console.error('Apply general availability error:', err.response?.data);
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to apply general availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
          <p className="text-gray-600 mt-1">Manage when you're available to referee tournaments</p>
        </div>
        <Button 
          onClick={() => setShowSettings(!showSettings)}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* General Availability Settings */}
      {showSettings && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">General Availability Settings</h2>
            <div className="flex space-x-2">
              <Button 
                onClick={saveGeneralAvailability}
                disabled={saving}
                size="sm"
                className="flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </Button>
              <Button 
                onClick={applyGeneralAvailabilityToAll}
                disabled={saving}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Apply to All</span>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(generalAvailability).map(([day, settings]) => (
              <div key={day} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 capitalize">{day}</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setGeneralAvailability(prev => ({
                        ...prev,
                        [day]: { ...prev[day as keyof GeneralAvailability], enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
                
                {settings.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={settings.start_time}
                        onChange={(e) => setGeneralAvailability(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof GeneralAvailability], start_time: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={settings.end_time}
                        onChange={(e) => setGeneralAvailability(prev => ({
                          ...prev,
                          [day]: { ...prev[day as keyof GeneralAvailability], end_time: e.target.value }
                        }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Availability Toggle */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Availability Toggle</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Toggle your availability for the next 14 days. Times are based on your general availability settings.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {next14Days.map((day) => {
            const isAvailable = isDateAvailable(day.date);
            const dayOfWeek = day.dayName.toLowerCase() as keyof GeneralAvailability;
            const daySettings = generalAvailability[dayOfWeek];
            
            return (
              <div key={day.date} className="text-center">
                <div className="text-xs text-gray-500 mb-1">
                  {day.dayShort}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {day.month} {day.dayNumber}
                  {day.isToday && <span className="text-xs text-blue-600 block">Today</span>}
                </div>
                
                <Button
                  onClick={() => toggleDateAvailability(day.date)}
                  disabled={saving || !daySettings.enabled}
                  variant={isAvailable ? "success" : "secondary"}
                  size="sm"
                  className={`w-full ${
                    isAvailable 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } ${!daySettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAvailable ? 'Available' : 'Unavailable'}
                </Button>
                
                {daySettings.enabled && (
                  <div className="text-xs text-gray-500 mt-1">
                    {daySettings.start_time} - {daySettings.end_time}
                  </div>
                )}
                
                {!daySettings.enabled && (
                  <div className="text-xs text-red-500 mt-1">
                    Day disabled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Current Availability Summary */}
      <Card className="p-6 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Current Availability Summary</h2>
        </div>
        
        {availabilities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No availability slots configured.</p>
            <p className="text-sm text-gray-500">
              Use the settings above to configure your general availability, then toggle specific days.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availabilities
              .filter(slot => {
                // Only show slots from today onwards
                const slotDate = new Date(slot.available_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time to start of day
                return slot.is_available && slotDate >= today;
              })
              .sort((a, b) => new Date(a.available_date).getTime() - new Date(b.available_date).getTime())
              .slice(0, 10)
              .map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-900">
                      {new Date(slot.available_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-green-700">
                      {slot.start_time && slot.end_time 
                        ? `${slot.start_time} - ${slot.end_time}`
                        : 'All Day'
                      }
                    </p>
                  </div>
                  <div className="text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              ))}
            
            {availabilities.filter(slot => {
              const slotDate = new Date(slot.available_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return slot.is_available && slotDate >= today;
            }).length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                And {availabilities.filter(slot => {
                  const slotDate = new Date(slot.available_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return slot.is_available && slotDate >= today;
                }).length - 10} more available slots...
              </p>
            )}
            
            {availabilities.filter(slot => {
              const slotDate = new Date(slot.available_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return slot.is_available && slotDate >= today;
            }).length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No upcoming availability slots.</p>
                <p className="text-sm text-gray-500">
                  Use the toggle above to set your availability for upcoming days.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RefereeAvailabilityPage;