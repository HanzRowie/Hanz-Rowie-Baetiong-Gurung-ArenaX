import React, { useState, useEffect } from 'react';
import { venueService } from '../services/venueService';
import type { VenueBooking, Venue } from '../types/venue.types';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar, Clock, CheckCircle, XCircle,
  MessageCircle, DollarSign, Building2, User,
  RefreshCw
} from 'lucide-react';

const VenueBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'history'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'VENUE_OWNER') {
      loadVenues();
      loadBookings();
    }
  }, [user, selectedVenue]);

  const loadVenues = async () => {
    try {
      const response = await venueService.getMyVenues();
      setVenues(response.venues);
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  const loadBookings = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const venueId = selectedVenue === 'all' ? undefined : selectedVenue;
      const response = await venueService.getBookingRequests(venueId);
      setBookings(response.bookings);
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'pending':
        return bookings.filter(b => b.status === 'PENDING');
      case 'confirmed':
        return bookings.filter(b => b.status === 'CONFIRMED');
      case 'history':
        return bookings.filter(b => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status));
      default:
        return bookings;
    }
  };

  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const historyBookings = bookings.filter(b => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status));

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (user?.role !== 'VENUE_OWNER') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need to be a venue owner to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venue Bookings</h1>
          <p className="text-gray-600">Manage booking requests and track your venue performance</p>
        </div>

        <button
          onClick={() => loadBookings(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Venue Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Venue</label>
        <select
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">All Venues</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{confirmedBookings.length}</p>
          <span className="text-xs text-gray-500 mt-1">Upcoming bookings</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</span>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${[...confirmedBookings, ...historyBookings].reduce((sum, booking) => sum + parseFloat(booking.total_cost?.toString() || '0'), 0).toLocaleString()}
          </p>
          <span className="text-xs text-gray-500 mt-1">Total earnings</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {historyBookings.filter(booking => booking.status === 'COMPLETED').length}
          </p>
          <span className="text-xs text-gray-500 mt-1">Past bookings</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Pending ({pendingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'confirmed'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Confirmed ({confirmedBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              History ({historyBookings.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          <BookingsList
            bookings={getFilteredBookings()}
            loading={loading}
            activeTab={activeTab}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            onBookingAction={async (requestId, action) => {
              try {
                const endpoint = action === 'accept' ? 'approve' : 'reject';
                // Use the configured api instance (needs import if not available, or venueService method)
                // Assuming we can use venueService or need to add a method there 
                // or use the 'api' instance from services/api
                const { default: api } = await import('../services/api');
                await api.post(`/api/bookings/${requestId}/${endpoint}/`);
                // Reload bookings
                loadBookings();
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Bookings List Component
interface BookingsListProps {
  bookings: VenueBooking[];
  loading: boolean;
  activeTab: string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  onBookingAction: (requestId: string, action: 'accept' | 'reject') => Promise<void>;
}

const BookingsList: React.FC<BookingsListProps> = ({ bookings, loading, activeTab, getStatusColor, getStatusIcon, onBookingAction }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No {activeTab} bookings
        </h3>
        <p className="text-gray-600">
          {activeTab === 'pending' && 'No pending booking requests.'}
          {activeTab === 'confirmed' && 'No confirmed bookings yet.'}
          {activeTab === 'history' && 'No booking history available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{booking.purpose || 'Venue Booking'}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{booking.booker?.name || 'Unknown User'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{booking.venue?.name || 'Venue'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{booking.start_time} - {booking.end_time} ({booking.total_hours || 0}h)</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">${booking.total_cost || 0}</p>
              {booking.payment_status && (
                <p className="text-xs text-green-600">Payment: {booking.payment_status}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {activeTab === 'confirmed'
                ? `Scheduled for ${new Date(booking.booking_date).toLocaleDateString()}`
                : activeTab === 'pending'
                  ? `Requested on ${new Date(booking.created_at || Date.now()).toLocaleDateString()}`
                  : `${booking.status === 'COMPLETED' ? 'Completed' :
                    booking.status === 'REJECTED' ? 'Rejected' : 'Cancelled'} on ${new Date(booking.updated_at || booking.created_at).toLocaleDateString()}`
              }
            </span>

            {activeTab === 'confirmed' && (
              <button
                onClick={() => {/* Navigate to chats */ }}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </button>
            )}

            {activeTab === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onBookingAction(booking.id.toString(), 'accept')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-3 w-3" />
                  Accept
                </button>
                <button
                  onClick={() => onBookingAction(booking.id.toString(), 'reject')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VenueBookingsPage;