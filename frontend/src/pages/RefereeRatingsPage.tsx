import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Star, Trophy, Calendar, User } from 'lucide-react';
import { api } from '../services/api';

interface RefereeRating {
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

const RefereeRatingsPage: React.FC = () => {
  const [ratings, setRatings] = useState<RefereeRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/referees/ratings/');
      setRatings(response.data);
      calculateStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ratingsData: RefereeRating[]) => {
    if (ratingsData.length === 0) {
      setStats({
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }

    const total = ratingsData.length;
    const sum = ratingsData.reduce((acc, rating) => acc + rating.rating, 0);
    const average = sum / total;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingsData.forEach(rating => {
      distribution[rating.rating as keyof typeof distribution]++;
    });

    setStats({
      averageRating: average,
      totalRatings: total,
      ratingDistribution: distribution
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
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
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Ratings</h1>
        <p className="text-gray-600 mt-1">View feedback from tournament organizers</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.averageRating.toFixed(1)}
                </p>
                <div className="flex">
                  {renderStars(Math.floor(stats.averageRating))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ratings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRatings}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">5-Star Ratings</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.ratingDistribution[5]}
              </p>
              <p className="text-xs text-gray-500">
                {stats.totalRatings > 0 ? Math.round((stats.ratingDistribution[5] / stats.totalRatings) * 100) : 0}% of total
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Star className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 w-12">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: stats.totalRatings > 0 
                      ? `${(stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalRatings) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-8">
                {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Ratings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Ratings</h3>
        
        {ratings.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No ratings yet</p>
            <p className="text-sm text-gray-500">
              Complete tournaments to receive ratings from organizers
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div key={rating.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {renderStars(rating.rating)}
                      <span className="text-sm font-medium text-gray-900">
                        {rating.rating}/5
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-4 h-4" />
                    <span>{rating.tournament.title}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>by {rating.organizer.full_name}</span>
                  </div>
                </div>
                
                {rating.comment && (
                  <div className="mt-3 p-3 bg-white rounded border-l-4 border-yellow-400">
                    <p className="text-sm text-gray-700 italic">
                      "{rating.comment}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RefereeRatingsPage;