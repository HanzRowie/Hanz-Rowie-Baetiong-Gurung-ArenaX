import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { 
  Calendar, 
  Clock, 
  Star, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface RefereeStats {
  total_bookings: number;
  accepted_bookings: number;
  completed_matches: number;
  average_rating: number;
}

interface UpcomingBooking {
  id: string;
  tournament_title: string;
  match_date: string;
  status: string;
  fee: number;
}

interface RecentRating {
  id: string;
  rating: number;
  comment: string;
  tournament: {
    title: string;
  };
  organizer: {
    full_name: string;
  };
  created_at: string;
}

interface DashboardData {
  statistics: RefereeStats;
  upcoming_bookings: UpcomingBooking[];
  recent_ratings: RecentRating[];
}

const RefereeDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/referees/dashboard/');
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'requested': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'declined': return 'text-red-600 bg-red-100';
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
          <Button 
            onClick={fetchDashboardData}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, Referee!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your assignments and track your referee performance.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{data.statistics.total_bookings}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{data.statistics.accepted_bookings}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{data.statistics.completed_matches}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-yellow-600">{data.statistics.average_rating}</p>
                <div className="flex">
                  {renderStars(Math.floor(data.statistics.average_rating))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Assignments</h2>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/referee/bookings')}
            >
              View All
            </Button>
          </div>

          {data.upcoming_bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No upcoming assignments</p>
              <p className="text-sm text-gray-500 mt-2">
                Set your availability to receive referee requests
              </p>
              <Button 
                className="mt-4" 
                size="sm"
                onClick={() => navigate('/referee/availability')}
              >
                Manage Availability
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.upcoming_bookings.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{booking.tournament_title}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(booking.match_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(booking.match_date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <span className="text-sm font-medium text-green-600">
                      ${booking.fee.toFixed(2)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="capitalize">{booking.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Ratings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Ratings</h2>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/referee/ratings')}
            >
              View All
            </Button>
          </div>

          {data.recent_ratings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No ratings yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Complete tournaments to receive ratings from organizers
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recent_ratings.map((rating) => (
                <div key={rating.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                      {renderStars(rating.rating)}
                      <span className="text-sm font-medium text-gray-900">
                        {rating.rating}/5
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {rating.tournament.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    by {rating.organizer.full_name}
                  </p>
                  {rating.comment && (
                    <p className="text-sm text-gray-700 italic">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button 
            className="flex items-center justify-center space-x-2 p-4 bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => navigate('/referee/availability')}
          >
            <Calendar className="w-5 h-5" />
            <span>Manage Availability</span>
          </Button>
          
          <Button 
            className="flex items-center justify-center space-x-2 p-4 bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={() => navigate('/referee/management')}
          >
            <Trophy className="w-5 h-5" />
            <span>View Assignments</span>
          </Button>
          
          <Button 
            className="flex items-center justify-center space-x-2 p-4 bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={() => navigate('/profile')}
          >
            <Users className="w-5 h-5" />
            <span>Update Profile</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RefereeDashboardPage;