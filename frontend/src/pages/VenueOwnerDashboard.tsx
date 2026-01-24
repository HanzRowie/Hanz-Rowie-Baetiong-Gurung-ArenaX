import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Calendar, MessageCircle,
  TrendingUp, DollarSign, Clock, CheckCircle,
  XCircle,
  BarChart3, ArrowUpRight
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import toastService from '@/services/toastService';
import { venueService } from '@/services/venueService';
import api from '@/services/api';
import VenueMap from '@/components/VenueMap';

export default function VenueOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVenues: 0,
    totalBookings: 0,
    monthlyRevenue: 0,
    pendingRequests: 0,
    occupancyRate: 0,
    averageRating: 0
  });
  const [venues, setVenues] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load venues
      const venuesResponse = await venueService.getMyVenues();
      setVenues(venuesResponse.venues);

      // Load booking requests
      const bookingsResponse = await venueService.getBookingRequests();
      const pendingBookings = bookingsResponse.bookings.filter(b => b.status === 'PENDING');
      const confirmedBookings = bookingsResponse.bookings.filter(b => b.status === 'CONFIRMED');

      setBookingRequests(pendingBookings);
      setRecentBookings(confirmedBookings.slice(0, 5));

      // Calculate stats
      const totalBookings = bookingsResponse.bookings.length;
      const monthlyRevenue = bookingsResponse.bookings
        .filter(b => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + parseFloat(b.total_cost?.toString() || '0'), 0);

      setStats({
        totalVenues: venuesResponse.venues.length,
        totalBookings,
        monthlyRevenue,
        pendingRequests: pendingBookings.length,
        occupancyRate: venuesResponse.venues.length > 0 ? Math.round((totalBookings / (venuesResponse.venues.length * 30)) * 100) : 0,
        averageRating: venuesResponse.venues.reduce((sum, v) => sum + (v.rating || 0), 0) / venuesResponse.venues.length || 0
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toastService.error('Failed to load dashboard data');

      // Fallback to empty data
      setStats({
        totalVenues: 0,
        totalBookings: 0,
        monthlyRevenue: 0,
        pendingRequests: 0,
        occupancyRate: 0,
        averageRating: 0
      });
      setVenues([]);
      setBookingRequests([]);
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const endpoint = action === 'accept' ? 'approve' : 'reject';
      await api.post(`/api/venues/bookings/${requestId}/${endpoint}/`);

      setBookingRequests(prev => prev.filter(req => req.id !== requestId));
      toastService.success(`Booking request ${action}ed successfully`);

      // Reload data to update stats
      loadDashboardData();
    } catch (error) {
      console.error('Error handling booking request:', error);
      toastService.error('Failed to process booking request');
    }
  };

  if (!user || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.full_name?.split(' ')[0] || 'Venue Owner'}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your venues, track bookings, and grow your business.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Venues</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalVenues}</p>
          <span className="text-xs text-gray-500 mt-1">Active properties</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Bookings</span>
            <Calendar className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600">+12% this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</span>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
          <span className="text-xs text-gray-500 mt-1">This month</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</span>
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
          <span className="text-xs text-gray-500 mt-1">Booking requests</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Occupancy</span>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600">+5% vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</span>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
          <span className="text-xs text-gray-500 mt-1">Average rating</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Venues Map & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Venues Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">My Venues</h3>
                <p className="text-sm text-gray-500">Interactive map showing all your venue locations</p>
              </div>
              <button
                onClick={() => navigate('/venues')}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
              >
                View All Venues
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            {/* Interactive Map */}
            <VenueMap
              venues={venues}
              onVenueClick={(venue) => navigate(`/venues/${venue.id}`)}
              height="300px"
            />

            {/* Map Summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>Showing {venues.length} venue{venues.length !== 1 ? 's' : ''}</span>
              <span>Click on pins to view venue details</span>
            </div>
          </div>
        </div>

        {/* Right Column - Booking Requests & Recent Activity */}
        <div className="space-y-6">
          {/* Pending Booking Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Booking Requests</h3>
                <p className="text-sm text-gray-500">{bookingRequests.length} pending</p>
              </div>
              <button
                onClick={() => navigate('/venue-bookings')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            {bookingRequests.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-600 text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{request.booker?.name || 'Unknown User'}</p>
                        <p className="text-sm text-gray-600">{request.venue?.name || 'Venue'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.booking_date).toLocaleDateString()} • {request.start_time} - {request.end_time}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Pending
                      </span>
                    </div>

                    {request.notes && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {request.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        ${request.total_cost || 0}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBookingRequest(request.id, 'accept')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleBookingRequest(request.id, 'reject')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                        <button
                          onClick={() => navigate('/chats')}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
              <button
                onClick={() => navigate('/venue-bookings')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {recentBookings.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600 text-sm">No recent bookings</p>
                </div>
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className={`h-8 w-8 rounded flex items-center justify-center ${booking.status === 'COMPLETED' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                      <Calendar className={`h-4 w-4 ${booking.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{booking.venue?.name || 'Venue'}</p>
                      <p className="text-xs text-gray-600">
                        {booking.booker?.name || 'Unknown User'} • {new Date(booking.booking_date).toLocaleDateString()} • {booking.start_time} - {booking.end_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">${booking.total_cost || 0}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${booking.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                        }`}>
                        {booking.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}