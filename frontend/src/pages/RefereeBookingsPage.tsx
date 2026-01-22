import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { refereeService } from '@/services';
import type { RefereeBooking } from '@/types/user.types';
import { Check, X, MessageCircle, Clock, Trophy, User, MapPin, Calendar, Filter, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RefereeBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<RefereeBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    cancelled: 0,
    acceptanceRate: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    if (!user || user.role !== 'REFEREE') {
      navigate('/dashboard');
      return;
    }
    loadBookings();
  }, [user, navigate]);

  const loadBookings = async () => {
    try {
      const data = await refereeService.getRefereeBookingRequests();
      setBookings(data);
      calculateStatistics(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStatistics = (bookings: RefereeBooking[]) => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'REQUESTED').length;
    const accepted = bookings.filter(b => b.status === 'ACCEPTED').length;
    const declined = bookings.filter(b => b.status === 'DECLINED').length;
    const cancelled = bookings.filter(b => b.status === 'CANCELLED').length;
    const acceptanceRate = total > 0 ? Math.round((accepted / (accepted + declined)) * 100) || 0 : 0;
    
    // Calculate average response time (simplified - would need actual timestamps)
    const respondedBookings = bookings.filter(b => b.responded_at);
    const avgResponseTime = respondedBookings.length > 0 ? 2.5 : 0; // Mock average in hours

    setStatistics({
      total,
      pending,
      accepted,
      declined,
      cancelled,
      acceptanceRate,
      avgResponseTime
    });
  };

  const handleRespond = async (bookingId: string, action: 'accept' | 'decline') => {
    try {
      await refereeService.respondToBookingRequest(bookingId, action);
      loadBookings(); // Refresh the list
    } catch (error) {
      console.error('Error responding to booking:', error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus.toUpperCase();
    const matchesSearch = searchTerm === '' || 
      booking.tournament_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.match_details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== 'REFEREE') {
    return null;
  }

  const pendingBookings = filteredBookings.filter(b => b.status === 'REQUESTED');
  const acceptedBookings = filteredBookings.filter(b => b.status === 'ACCEPTED');
  const declinedBookings = filteredBookings.filter(b => b.status === 'DECLINED');
  const cancelledBookings = filteredBookings.filter(b => b.status === 'CANCELLED');

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
                onClick={() => navigate('/tournaments')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Tournaments
              </button>
              <button
                onClick={() => navigate('/referee/availability')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Manage Availability
              </button>
              <button
                onClick={() => navigate('/referee/schedule')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Schedule
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Referee Booking Requests</h1>
            <p className="text-gray-600 mt-2">
              View and respond to match booking requests from tournament organizers.
            </p>
          </div>
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="h-5 w-5" />
            {showStatistics ? 'Hide' : 'Show'} Statistics
          </button>
        </div>

        {/* Statistics Panel */}
        {showStatistics && (
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.accepted}</div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.declined}</div>
              <div className="text-sm text-gray-600">Declined</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{statistics.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.acceptanceRate}%</div>
              <div className="text-sm text-gray-600">Accept Rate</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.avgResponseTime}h</div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tournaments or matches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="requested">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Pending Requests */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-orange-600" />
            Pending Requests ({pendingBookings.length})
          </h2>

          {pendingBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">You don't have any booking requests to respond to at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{booking.tournament_title}</span>
                        <span className="text-sm text-gray-500">• {booking.match_details}</span>
                      </div>

                      {/* Enhanced booking details */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Organizer: Tournament Organizer</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Match Date: TBD</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>Duration: 2 hours (estimated)</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>Venue: TBD</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <h4 className="font-medium text-gray-900 mb-1">Additional Notes:</h4>
                        <p className="text-gray-600 text-sm">{booking.notes || 'No additional notes provided'}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Requested {new Date(booking.requested_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-6">
                      <button
                        onClick={() => handleRespond(booking.id, 'accept')}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(booking.id, 'decline')}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Accepted Bookings */}
        {acceptedBookings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              Accepted Bookings ({acceptedBookings.length})
            </h2>

            <div className="space-y-4">
              {acceptedBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{booking.tournament_title}</h3>
                        <p className="text-gray-600">{booking.match_details}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Accepted on {new Date(booking.responded_at || booking.requested_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Match Date: TBD</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Check className="h-4 w-4 mr-1" />
                        Accepted
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Declined Bookings */}
        {declinedBookings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <X className="h-6 w-6 text-red-600" />
              Declined Bookings ({declinedBookings.length})
            </h2>

            <div className="space-y-4">
              {declinedBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-100 p-2 rounded-lg">
                        <X className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{booking.tournament_title}</h3>
                        <p className="text-gray-600">{booking.match_details}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Declined on {new Date(booking.responded_at || booking.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <X className="h-4 w-4 mr-1" />
                        Declined
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <X className="h-6 w-6 text-gray-600" />
              Cancelled Bookings ({cancelledBookings.length})
            </h2>

            <div className="space-y-4">
              {cancelledBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <X className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{booking.tournament_title}</h3>
                        <p className="text-gray-600">{booking.match_details}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Cancelled on {new Date(booking.responded_at || booking.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        <X className="h-4 w-4 mr-1" />
                        Cancelled
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
