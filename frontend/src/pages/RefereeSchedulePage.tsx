import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { refereeService } from '@/services';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Users, 
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  tournament: string;
  venue: string;
  status: 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  matchDetails: string;
  organizer?: {
    name: string;
    contact: string;
  };
  preparation?: {
    rules?: string;
    equipment?: string[];
    notes?: string;
    travelTime?: number; // minutes
    arrivalTime?: string;
  };
  conflictsWith?: string[]; // IDs of conflicting events
}

interface PerformanceStats {
  totalMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  completionRate: number;
  averageRating?: number;
  onTimePercentage: number;
  monthlyEarnings: number;
  upcomingMatches: number;
}

export default function RefereeSchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalMatches: 0,
    completedMatches: 0,
    cancelledMatches: 0,
    completionRate: 0,
    onTimePercentage: 0,
    monthlyEarnings: 0,
    upcomingMatches: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'performance'>('calendar');
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'REFEREE') {
      navigate('/dashboard');
      return;
    }
    loadScheduleData();
  }, [user, navigate]);

  const loadScheduleData = async () => {
    try {
      const bookingData = await refereeService.getRefereeBookingRequests();
      const acceptedBookings = bookingData.filter(b => b.status === 'ACCEPTED');
      
      // Transform bookings into schedule events with enhanced data
      const events: ScheduleEvent[] = acceptedBookings.map(booking => ({
        id: booking.id,
        title: `${booking.tournament_title} - ${booking.match_details}`,
        date: booking.requested_at.split('T')[0], // This would ideally be match date from backend
        time: '10:00', // This would come from match scheduling
        tournament: booking.tournament_title,
        venue: 'Sports Complex Arena', // This would come from match venue info
        status: 'ACCEPTED',
        matchDetails: booking.match_details,
        organizer: {
          name: 'Tournament Organizer',
          contact: 'organizer@example.com'
        },
        preparation: {
          rules: 'Standard tournament rules apply. Review match format and scoring system.',
          equipment: ['Whistle', 'Score cards', 'Timer', 'First aid kit'],
          notes: booking.notes || 'No additional notes',
          travelTime: 30, 
          arrivalTime: '09:30' 
        }
      }));
      
      setScheduleEvents(events);
      detectConflicts(events);
      calculatePerformanceStats(events);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectConflicts = (events: ScheduleEvent[]) => {
    const conflictIds: string[] = [];
    const eventsByDate = events.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {} as Record<string, ScheduleEvent[]>);

    Object.values(eventsByDate).forEach(dayEvents => {
      if (dayEvents.length > 1) {
        // Enhanced conflict detection - check for time overlaps and travel time
        for (let i = 0; i < dayEvents.length; i++) {
          for (let j = i + 1; j < dayEvents.length; j++) {
            const eventA = dayEvents[i];
            const eventB = dayEvents[j];
            
            // Simple conflict detection - if multiple events on same day
            // In a real implementation, this would check actual time overlaps
            conflictIds.push(eventA.id, eventB.id);
            
            // Update events with conflict information
            if (!eventA.conflictsWith) eventA.conflictsWith = [];
            if (!eventB.conflictsWith) eventB.conflictsWith = [];
            eventA.conflictsWith.push(eventB.id);
            eventB.conflictsWith.push(eventA.id);
          }
        }
      }
    });

    setConflicts([...new Set(conflictIds)]);
  };

  const calculatePerformanceStats = (events: ScheduleEvent[]) => {
    const total = events.length;
    const completed = events.filter(e => e.status === 'COMPLETED').length;
    const cancelled = events.filter(e => e.status === 'CANCELLED').length;
    const upcoming = events.filter(e => e.status === 'ACCEPTED' && new Date(e.date) > new Date()).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const onTimePercentage = 95; // Mock data - would be calculated from actual performance
    const monthlyEarnings = completed * 75; // Mock calculation - $75 per match

    setPerformanceStats({
      totalMatches: total,
      completedMatches: completed,
      cancelledMatches: cancelled,
      completionRate: Math.round(completionRate),
      onTimePercentage,
      monthlyEarnings,
      upcomingMatches: upcoming
    });
  };

  const getEventsForDate = (date: string) => {
    return scheduleEvents.filter(event => event.date === date);
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
   
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = date.toISOString().split('T')[0];
      const events = getEventsForDate(dateString);
      const hasConflict = events.some(event => conflicts.includes(event.id));
      
      days.push({
        day,
        date: dateString,
        events,
        hasConflict,
        isToday: dateString === new Date().toISOString().split('T')[0]
      });
    }
    
    return days;
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== 'REFEREE') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/images/Logo.jpg"
                alt="ArenaX Logo"
                className="h-10 w-10 object-contain rounded-lg"
              />
              <span className="text-2xl font-bold text-gray-900">ArenaX</span>
            </div>
            <nav className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/referee/availability')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Manage Availability
              </button>
              <button
                onClick={() => navigate('/referee/bookings')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Booking Requests
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Referee Schedule</h1>
          <p className="text-gray-600 mt-2">
            View your accepted bookings, match preparation details, and performance tracking.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setViewMode('calendar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-5 w-5 inline mr-2" />
                Calendar View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="h-5 w-5 inline mr-2" />
                List View
              </button>
              <button
                onClick={() => setViewMode('performance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-5 w-5 inline mr-2" />
                Performance
              </button>
            </nav>
          </div>
        </div>

        {/* Conflict Alerts */}
        {conflicts.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                Schedule Conflicts Detected
              </span>
            </div>
            <p className="text-yellow-700 mt-1">
              You have {conflicts.length} potential scheduling conflicts. Please review your calendar.
            </p>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-200 ${
                    day?.isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                  } ${day?.hasConflict ? 'bg-red-50 border-red-300' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium ${
                        day.isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {day.day}
                      </div>
                      {day.events.map(event => (
                        <div
                          key={event.id}
                          className={`mt-1 p-1 text-xs rounded ${
                            conflicts.includes(event.id)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {event.time} - {event.tournament}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {scheduleEvents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled matches</h3>
                <p className="text-gray-600">You don't have any accepted bookings at the moment.</p>
              </div>
            ) : (
              scheduleEvents.map(event => (
                <div
                  key={event.id}
                  className={`bg-white rounded-xl shadow-md p-6 ${
                    conflicts.includes(event.id) ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">{event.tournament}</h3>
                        {conflicts.includes(event.id) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2">{event.matchDetails}</p>
                      
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {event.time} {event.preparation?.arrivalTime && `(Arrive: ${event.preparation.arrivalTime})`}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.venue}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.status}
                          </div>
                        </div>

                        {/* Organizer Information */}
                        {event.organizer && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                            <h5 className="font-medium text-blue-900 text-sm">Organizer Contact</h5>
                            <div className="text-sm text-blue-700">
                              <div>{event.organizer.name}</div>
                              <div>{event.organizer.contact}</div>
                            </div>
                          </div>
                        )}

                        {/* Match Preparation */}
                        {event.preparation && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Match Preparation</h4>
                            <div className="space-y-2 text-sm">
                              {event.preparation.rules && (
                                <div>
                                  <span className="font-medium">Rules:</span> {event.preparation.rules}
                                </div>
                              )}
                              {event.preparation.equipment && (
                                <div>
                                  <span className="font-medium">Equipment:</span> {event.preparation.equipment.join(', ')}
                                </div>
                              )}
                              {event.preparation.travelTime && (
                                <div>
                                  <span className="font-medium">Travel Time:</span> {event.preparation.travelTime} minutes
                                </div>
                              )}
                              {event.preparation.notes && (
                                <div>
                                  <span className="font-medium">Notes:</span> {event.preparation.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Conflict Warning */}
                        {event.conflictsWith && event.conflictsWith.length > 0 && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-1 text-red-700 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Schedule Conflict</span>
                            </div>
                            <p className="text-red-600 text-sm mt-1">
                              This match conflicts with {event.conflictsWith.length} other booking(s) on the same day.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Performance View */}
        {viewMode === 'performance' && (
          <div className="space-y-6">
            {/* Performance Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Matches</p>
                    <p className="text-2xl font-bold text-gray-900">{performanceStats.totalMatches}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{performanceStats.completedMatches}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Upcoming</p>
                    <p className="text-2xl font-bold text-blue-600">{performanceStats.upcomingMatches}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{performanceStats.completionRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Additional Performance Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On-Time Performance</p>
                    <p className="text-2xl font-bold text-green-600">{performanceStats.onTimePercentage}%</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${performanceStats.onTimePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
                    <p className="text-2xl font-bold text-purple-600">${performanceStats.monthlyEarnings}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm text-gray-500 mt-1">Based on completed matches</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{performanceStats.cancelledMatches}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {performanceStats.totalMatches > 0 
                    ? `${Math.round((performanceStats.cancelledMatches / performanceStats.totalMatches) * 100)}% of total`
                    : 'No cancellations'
                  }
                </p>
              </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Performance chart showing match completion rates,</p>
                  <p className="text-gray-500">earnings trends, and punctuality metrics over time</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {scheduleEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        event.status === 'COMPLETED' ? 'bg-green-100' :
                        event.status === 'CANCELLED' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {event.status === 'COMPLETED' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : event.status === 'CANCELLED' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{event.tournament}</p>
                        <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}