import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Trophy, Users, Calendar,
  Clock, MapPin, Sun
} from 'lucide-react';
import { organizerDashboardService, type OrganizerStats, type RecentMatch, type RecentActivity } from '@/services/organizerDashboardService';
import toastService from '@/services/toastService';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrganizerStats>({
    totalTournaments: 0,
    totalParticipants: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalRevenue: 0,
    averageParticipants: 0,
    fillRate: 0,
    revenueGrowth: 0,
  });
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      
      const [
        organizerStatsData,
        recentMatchesData,
        recentActivityData
      ] = await Promise.all([
        organizerDashboardService.getOrganizerStats().catch((error) => {
          console.error('Failed to load organizer stats:', error);
          return {
            totalTournaments: 0,
            totalParticipants: 0,
            upcomingEvents: 0,
            completedEvents: 0,
            totalRevenue: 0,
            averageParticipants: 0,
            fillRate: 0,
            revenueGrowth: 0,
          };
        }),
        organizerDashboardService.getRecentMatches(2).catch((error) => {
          console.error('Failed to load recent matches:', error);
          return [];
        }),
        organizerDashboardService.getRecentActivity(3).catch((error) => {
          console.error('Failed to load recent activity:', error);
          return [];
        })
      ]);
      
      console.log('Dashboard data loaded:', {
        stats: organizerStatsData,
        matches: recentMatchesData,
        activity: recentActivityData
      });
      
      setStats(organizerStatsData);
      setRecentMatches(recentMatchesData);
      setRecentActivity(recentActivityData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toastService.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">
                      {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Alex'}! 👑
                    </h1>
                  </div>
                  <p className="text-purple-100 mb-6 max-w-lg">
                    Ready to dominate the season? You have 3 tournaments starting today and 12 pending player registrations.
                  </p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => navigate('/tournaments/create')}
                      className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Tournament
                    </button>
                    <button 
                      onClick={() => navigate('/my-tournaments')}
                      className="border border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                    >
                      View Schedule
                    </button>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 text-purple-100 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">KATHMANDU, NEPAL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">24°C</span>
                    <Sun className="h-6 w-6 text-yellow-300" />
                    <span className="text-purple-100">Sunny</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          {/* Tournament Overview Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tournament Overview</h2>
              <button 
                onClick={() => navigate('/my-tournaments')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View All Tournaments
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* My Tournaments */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.totalTournaments}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">My Tournaments</p>
                  <p className="text-xs text-gray-500">Organized events</p>
                </div>
              </div>

              {/* Participants */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Participants</p>
                  <p className="text-xs text-gray-500">Across all events</p>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Upcoming Events</p>
                  <p className="text-xs text-gray-500">Ready to start</p>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.completedEvents}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Completed</p>
                  <p className="text-xs text-gray-500">Successfully finished</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Results Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Recent Results</h2>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <button 
                onClick={() => navigate('/my-tournaments')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View All Matches
              </button>
            </div>

            {recentMatches.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recentMatches.slice(0, 2).map((match) => (
                  <div key={match.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full mb-2 ${
                          match.tournament.sport_type === 'FUTSAL' ? 'bg-green-100 text-green-800' :
                          match.tournament.sport_type === 'BADMINTON' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {match.tournament.sport_type}
                        </span>
                        <h3 className="font-semibold text-gray-900">{match.tournament.title}</h3>
                      </div>
                      <span className="text-xs text-gray-500">
                        Round {match.round_number}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <span className="text-sm font-bold text-green-700">
                              {match.tournament.sport_type === 'FUTSAL' ? '⚽' : '🏸'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 max-w-[80px] truncate">
                            {match.team1?.name || match.player1?.full_name || 'TBD'}
                          </p>
                        </div>
                        
                        <div className="text-center px-4">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {match.team1_score} - {match.team2_score}
                          </div>
                          <p className="text-xs text-green-600 font-medium">FINAL</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <span className="text-sm font-bold text-blue-700">
                              {match.tournament.sport_type === 'FUTSAL' ? '⚽' : '🏸'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 max-w-[80px] truncate">
                            {match.team2?.name || match.player2?.full_name || 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => navigate(`/tournaments/${match.tournament.id}`)}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        VIEW DETAILS
                      </button>
                      <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                        MATCH STATS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Results</h3>
                <p className="text-gray-600 mb-6">
                  Match results will appear here once tournaments are completed.
                </p>
                <button
                  onClick={() => navigate('/tournaments/create')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  Create Tournament
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 bg-white border-l border-gray-200 p-6">
          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <p className="text-sm text-gray-600 mb-4">Common tasks for organizers</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/tournaments/create')}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Create Tournament</span>
              </button>
              
              <button 
                onClick={() => navigate('/my-tournaments')}
                className="w-full flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Eye className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">Manage Tournaments</span>
              </button>
              
              <button 
                onClick={() => navigate('/venues')}
                className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">Find Venues</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-1">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Match Reports */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Match Reports</h3>
            <p className="text-sm text-gray-600 mb-4">
              Match reports and statistics will be available here soon.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}