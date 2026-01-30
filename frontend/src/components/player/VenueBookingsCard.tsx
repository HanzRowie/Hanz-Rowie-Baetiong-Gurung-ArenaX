import { MapPin, Calendar, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VenueBooking {
  id: string;
  venue_name: string;
  venue_location: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  amount: string;
  purpose: string;
}

interface VenueBookingsCardProps {
  bookings: VenueBooking[];
}

export default function VenueBookingsCard({ bookings }: VenueBookingsCardProps) {
  const navigate = useNavigate();

  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">My Venue Bookings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Your upcoming venue reservations</p>
          </div>
          <MapPin className="h-6 w-6 text-purple-600" />
        </div>
        
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-600 mb-4">No venue bookings yet</p>
          <button
            onClick={() => navigate('/venues')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Browse Venues
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PENDING':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">My Venue Bookings</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your upcoming venue reservations</p>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/bookings')}
          >
            {/* Venue Name and Status */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{booking.venue_name}</h4>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs">{booking.venue_location}</span>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                {getStatusIcon(booking.status)}
                {booking.status}
              </span>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-xs">{formatDate(booking.date)}</span>
              </div>
              {booking.start_time && booking.end_time && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs">{booking.start_time} - {booking.end_time}</span>
                </div>
              )}
            </div>

            {/* Purpose and Amount */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              {booking.purpose && (
                <span className="text-xs text-gray-600 italic">"{booking.purpose}"</span>
              )}
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>NPR {parseFloat(booking.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookings.length > 0 && (
        <button
          onClick={() => navigate('/venues')}
          className="w-full mt-4 bg-purple-50 text-purple-600 px-4 py-2.5 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
        >
          Book Another Venue
        </button>
      )}
    </div>
  );
}
