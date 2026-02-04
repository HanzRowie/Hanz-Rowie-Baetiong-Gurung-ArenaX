import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trophy,
  MapPin,
  User,
  DollarSign,
  Filter,
  Eye
} from 'lucide-react';
import { api } from '../services/api';

interface RefereeBooking {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    venue_name: string;
    venue_location: string;
  };
  match: {
    id: string;
    round_number: number;
    match_number: number;
  };
  requested_by: {
    full_name: string;
    email: string;
  };
  status: string;
  match_date: string;
  fee: number;
  notes: string;
  requested_at: string;
  responded_at: string | null;
}

const RefereeManagementPage: React.FC = () => {
  const [bookings, setBookings] = useState<RefereeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<RefereeBooking | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/referees/bookings/');
      setBookings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (bookingId: string, response: 'accept' | 'decline') => {
    try {
      setResponding(true);
      await api.post(`/api/referees/bookings/${bookingId}/respond/`, { response });
      await fetchBookings();
      setSelectedBooking(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to respond to booking');
    } finally {
      setResponding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'requested': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'declined': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'requested': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <Trophy className="w-4 h-4" />;
      case 'declined': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status.toLowerCase() === filter;
  });

  const groupBookingsByDate = (bookings: RefereeBooking[]) => {
    const groups: { [key: string]: RefereeBooking[] } = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.match_date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(booking);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchBookings}>Retry</Button>
        </Card>
      </div>
    );
  }

  const groupedBookings = groupBookingsByDate(filteredBookings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Management</h1>
          <p className="text-gray-600">Manage your referee assignments and schedule</p>
        </div>
        <Button onClick={() => window.location.href = '/referee/availability'}>
          Manage Availability
        </Button>
      </div>

      {/* Filter Tabs */}
      <Card className="p-4 mb-6">
        <div className="flex items-center space-x-1">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          {[
            { key: 'all', label: 'All' },
            { key: 'requested', label: 'Pending' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'completed', label: 'Completed' },
            { key: 'declined', label: 'Declined' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' 
              ? 'Set your availability to start receiving referee requests'
              : `You don't have any ${filter} assignments at the moment`
            }
          </p>
          <Button onClick={() => window.location.href = '/referee/availability'}>
            Manage Availability
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedBookings.map(([date, dayBookings]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              
              <div className="space-y-4">
                {dayBookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.tournament.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="capitalize">{booking.status}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date(booking.match_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {booking.tournament.venue_name}
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            {booking.requested_by.full_name}
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ${Number(booking.fee || 0).toFixed(2)}
                          </div>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Notes:</strong> {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        {booking.status === 'REQUESTED' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleResponse(booking.id, 'accept')}
                              disabled={responding}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResponse(booking.id, 'decline')}
                              disabled={responding}
                              className="text-red-600 hover:text-red-700"
                            >
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Tournament Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Title:</strong> {selectedBooking.tournament.title}</p>
                    <p><strong>Sport:</strong> {selectedBooking.tournament.sport_type}</p>
                    <p><strong>Venue:</strong> {selectedBooking.tournament.venue_name}</p>
                    <p><strong>Location:</strong> {selectedBooking.tournament.venue_location}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Match Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Round:</strong> {selectedBooking.match.round_number}</p>
                    <p><strong>Match:</strong> {selectedBooking.match.match_number}</p>
                    <p><strong>Date & Time:</strong> {new Date(selectedBooking.match_date).toLocaleString()}</p>
                    <p><strong>Fee:</strong> NPR {Number(selectedBooking.fee || 0).toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Organizer</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Name:</strong> {selectedBooking.requested_by.full_name}</p>
                    <p><strong>Email:</strong> {selectedBooking.requested_by.email}</p>
                  </div>
                </div>
                
                {selectedBooking.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>{selectedBooking.notes}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </p>
                    <p><strong>Requested:</strong> {new Date(selectedBooking.requested_at).toLocaleString()}</p>
                    {selectedBooking.responded_at && (
                      <p><strong>Responded:</strong> {new Date(selectedBooking.responded_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedBooking.status === 'REQUESTED' && (
                <div className="flex space-x-3 mt-6 pt-6 border-t">
                  <Button
                    onClick={() => handleResponse(selectedBooking.id, 'accept')}
                    disabled={responding}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {responding ? 'Processing...' : 'Accept Assignment'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleResponse(selectedBooking.id, 'decline')}
                    disabled={responding}
                    className="flex-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    {responding ? 'Processing...' : 'Decline Assignment'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefereeManagementPage;