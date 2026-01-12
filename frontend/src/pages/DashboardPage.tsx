import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Trophy, User, Calendar, Plus, Eye, 
  Users, Award, BarChart3,
  ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import { UserRole } from '@/types/auth.types';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '@/services/tournamentService';
import toastService from '@/services/toastService';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import PlayerCard from '@/components/PlayerCard';
import { dashboardService, type DashboardStats, type MonthlyStats, type NextTournament, type PlayerProfile } from '@/services/dashboardService';
import VenueOwnerDashboard from './VenueOwnerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for dashboard data
  const [myTournaments, setMyTournaments] = useState<any>({ organized_tournaments: [], registered_tournaments: [] });
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [nextTournament, setNextTournament] = useState<NextTournament | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingMatches: 0,
    totalTournaments: 0,
    totalParticipants: 0,
    winRate: 0,
    matchesWon: 0,
    matchesPlayed: 0,
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Reload dashboard data when user returns to the page (e.g., from profile page)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        // Reload profile data when window gets focus
        loadDashboardData();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Reload profile data when page becomes visible again
        loadDashboardData();
      }
    };

    const handleProfileUpdate = () => {
      if (user) {
        // Reload dashboard data when profile is updated
        loadDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  // Reload monthly stats when year changes
  useEffect(() => {
    if (user && !loading) {
      loadMonthlyStats();
    }
  }, [currentYear]);

  const loadMonthlyStats = async () => {
    try {
      const monthlyStatsData = await dashboardService.getMonthlyStats(currentYear);
      setMonthlyStats(monthlyStatsData);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard data in parallel with individual error handling
      const [
        dashboardStatsData,
        monthlyStatsData,
        nextTournamentData,
        profileData,
        myTournamentsResponse
      ] = await Promise.all([
        dashboardService.getDashboardStats().catch(() => ({
          upcomingMatches: 0,
          totalTournaments: 0,
          totalParticipants: 0,
          winRate: 0,
          matchesWon: 0,
          matchesPlayed: 0,
        })),
        dashboardService.getMonthlyStats(currentYear).catch(() => []),
        dashboardService.getNextTournament().catch(() => null),
        dashboardService.getPlayerProfile().catch(() => null),
        tournamentService.getMyTournaments().catch(() => ({ 
          organized_tournaments: [], 
          registered_tournaments: [] 
        }))
      ]);
      
      setStats(dashboardStatsData);
      setMonthlyStats(monthlyStatsData);
      setNextTournament(nextTournamentData);
      setProfile(profileData);
      setMyTournaments(myTournamentsResponse);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toastService.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }



  // Use monthly stats from service
  const maxValue = monthlyStats.length > 0 
    ? Math.max(...monthlyStats.map(d => Math.max(d.wins, d.losses)))
    : 10;

  const playerRank = profile
    ? ((profile.gender || user.gender) === 'FEMALE' ? profile.wtaRanking : profile.atpRanking)
    : undefined;

  const getDashboardContent = () => {
    if (loading) {
      return <DashboardSkeleton />;
    }

    switch (user.role) {
      case UserRole.PLAYER:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name?.split(' ')[0] || 'Player'}!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Here's a snapshot of your matches and upcoming tournaments.
              </p>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Matches</span>
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.matchesPlayed}</p>
                <span className="text-xs text-gray-500 mt-1">Across all tournaments</span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Matches Won</span>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.matchesWon}</p>
                <span className="text-xs text-gray-500 mt-1">
                  {stats.matchesPlayed > 0 ? `${Math.round((stats.matchesWon / stats.matchesPlayed) * 100)}% of games` : 'No games yet'}
                </span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Win Rate</span>
                  <BarChart3 className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.winRate.toFixed(1)}%</p>
                <span className="text-xs text-gray-500 mt-1">Based on recorded matches</span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rank</span>
                  <Award className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {playerRank ? `#${playerRank}` : 'Unranked'}
                </p>
                <span className="text-xs text-gray-500 mt-1">
                  {(profile?.gender || user.gender) === 'FEMALE' ? 'WTA' : 'ATP'} ranking
                </span>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column - Next Tournament + Performance Statistics */}
              <div className="lg:col-span-2 space-y-6">
                {/* Next Tournament Card */}
                {nextTournament ? (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    {nextTournament.match_scheduled && nextTournament.opponent ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Your Next Match</h2>
                            <p className="text-sm text-gray-500 mt-1">{nextTournament.title}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                              <Calendar className="h-4 w-4" />
                              {new Date(nextTournament.date).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-400">{nextTournament.venue}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                              {user.profile_picture ? (
                                <img 
                                  src={user.profile_picture}
                                  alt="You" 
                                  className="w-14 h-14 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-7 w-7 text-purple-600" />
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{user.full_name?.split(' ')[0]}</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-300">VS</div>
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                              <img 
                                src={nextTournament.opponent.avatar || '/images/Card Profile-1.png'}
                                alt="Opponent" 
                                className="w-14 h-14 rounded-full object-cover"
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{nextTournament.opponent.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/tournaments/${nextTournament.id}`)}
                          className="w-full mt-3 bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                        >
                          View Tournament Details
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Matchup TBD</h2>
                          <p className="text-sm text-gray-500 mt-1">
                            You're registered for <strong>{nextTournament.title}</strong>. We'll notify you when matchups are ready.
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                            <Calendar className="h-4 w-4" />
                            {new Date(nextTournament.date).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <button
                            onClick={() => navigate(`/tournaments/${nextTournament.id}`)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs"
                          >
                            View Tournament
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-dashed border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">No Upcoming Tournaments</h3>
                        <p className="text-sm text-gray-500">
                          Join a tournament to get your next match scheduled.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Browse Tournaments
                    </button>
                  </div>
                )}

                {/* Performance Statistics */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Performance Statistics</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Track your progress over time</p>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentYear(currentYear - 1)}
                        className="p-1.5 hover:bg-white rounded transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center px-2">
                        {currentYear}
                      </span>
                      <button
                        onClick={() => setCurrentYear(currentYear + 1)}
                        className="p-1.5 hover:bg-white rounded transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly Chart */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Monthly Performance</h4>
                      <div className="flex items-end justify-center h-40 space-x-2">
                        {monthlyStats.slice(0, 8).map((data) => (
                          <div key={data.month} className="flex flex-col items-center space-y-1.5 flex-1">
                            <div className="flex flex-col items-center space-y-0.5 w-full">
                              <div 
                                className="w-full bg-blue-500 rounded-t transition-all hover:opacity-80"
                                style={{ 
                                  height: `${Math.max((data.wins / maxValue) * 100, 5)}%`,
                                  minHeight: '3px'
                                }}
                              />
                              <div 
                                className="w-full bg-pink-500 rounded-b transition-all hover:opacity-80"
                                style={{ 
                                  height: `${Math.max((data.losses / maxValue) * 100, 5)}%`,
                                  minHeight: '3px'
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {data.month}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded bg-blue-500"></div>
                          <span className="text-xs text-gray-600">Wins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded bg-pink-500"></div>
                          <span className="text-xs text-gray-600">Losses</span>
                        </div>
                      </div>
                    </div>

                    {/* Win/Loss Donut Chart */}
                    <div className="flex flex-col items-center">
                      <h4 className="text-xs font-semibold text-gray-700 mb-4 uppercase tracking-wide">Overall Stats</h4>
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="url(#gradient1)"
                            strokeWidth="3"
                            strokeDasharray={`${stats.matchesPlayed > 0 ? (stats.matchesWon / stats.matchesPlayed) * 100 : 0}, 100`}
                          />
                          <defs>
                            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900">{stats.matchesWon}</span>
                          <span className="text-xs text-gray-500">Wins</span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1.5 w-full">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Total Matches</span>
                          <span className="font-semibold text-gray-900">{stats.matchesPlayed}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Win Rate</span>
                          <span className="font-semibold text-purple-600">{stats.winRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Player Card */}
              <div className="lg:col-span-1">
                <PlayerCard 
                  user={{
                    full_name: user.full_name,
                    gender: user.gender,
                    profile_picture: user.profile_picture || undefined,
                    country: user.country,
                    date_of_birth: user.date_of_birth,
                    phone_number: user.phone_number,
                  }}
                  profile={profile}
                  stats={{
                    matchesWon: stats.matchesWon,
                    matchesPlayed: stats.matchesPlayed,
                    winRate: stats.winRate
                  }}
                />
              </div>
            </div>
          </div>
        );

      case UserRole.ORGANIZER:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name?.split(' ')[0] || 'Organizer'}!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage your tournaments, track performance, and engage participants.
              </p>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTournaments}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">My Tournaments</p>
                  <p className="text-xs text-gray-600">Organized events</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Participants</p>
                  <p className="text-xs text-gray-600">Across all events</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:border-green-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{myTournaments?.organized_tournaments?.filter((t: any) => t.status === 'UPCOMING').length || 0}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Upcoming Events</p>
                  <p className="text-xs text-gray-600">Ready to start</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:border-orange-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                    <Award className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{myTournaments?.organized_tournaments?.filter((t: any) => t.status === 'COMPLETED').length || 0}</p>
                    <p className="text-xs text-gray-500">Done</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Completed</p>
                  <p className="text-xs text-gray-600">Successfully finished</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button 
                  onClick={() => navigate('/tournaments/create')}
                  className="flex items-center gap-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl group"
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Create Tournament</p>
                    <p className="text-sm opacity-90">Set up a new event</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/tournaments')}
                  className="flex items-center gap-4 border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Eye className="h-5 w-5 group-hover:text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Browse Tournaments</p>
                    <p className="text-sm text-gray-600">View all events</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/venues')}
                  className="flex items-center gap-4 border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-green-100 transition-colors">
                    <Trophy className="h-5 w-5 group-hover:text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Find Venues</p>
                    <p className="text-sm text-gray-600">Book locations</p>
                  </div>
                </button>
              </div>
            </div>

            {/* My Tournaments */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Tournaments</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage your organized events</p>
                </div>
                {myTournaments?.organized_tournaments?.length > 0 && (
                  <button
                    onClick={() => navigate('/my-tournaments')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    View All
                  </button>
                )}
              </div>
              
              {myTournaments?.organized_tournaments?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No tournaments yet</h4>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Get started by creating your first tournament and building your community.
                  </p>
                  <button
                    onClick={() => navigate('/tournaments/create')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors font-medium"
                  >
                    Create Your First Tournament
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myTournaments?.organized_tournaments?.slice(0, 6).map((tournament: any) => (
                    <div key={tournament.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {tournament.tournament_image ? (
                            <img src={tournament.tournament_image} alt={tournament.title} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 line-clamp-1">{tournament.title}</h4>
                            <p className="text-sm text-gray-600">{tournament.sport_type}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tournament.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                          tournament.status === 'ONGOING' ? 'bg-green-100 text-green-800' :
                          tournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>{tournament.registered_count}/{tournament.max_participants} participants</span>
                        <span>{new Date(tournament.date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        className="w-full bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200"
                      >
                        Manage Tournament
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Insights */}
            {myTournaments?.organized_tournaments?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((myTournaments?.organized_tournaments?.reduce((sum: number, t: any) => sum + t.registered_count, 0) / myTournaments?.organized_tournaments?.reduce((sum: number, t: any) => sum + t.max_participants, 0)) * 100) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Avg. Fill Rate</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(myTournaments?.organized_tournaments?.reduce((sum: number, t: any) => sum + t.registered_count, 0) / myTournaments?.organized_tournaments?.length) || 0}
                    </p>
                    <p className="text-sm text-gray-600">Avg. Participants</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Award className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${myTournaments?.organized_tournaments?.reduce((sum: number, t: any) => sum + (t.entry_fee * t.registered_count), 0).toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case UserRole.VENUE_OWNER:
        return <VenueOwnerDashboard />;
    }
  };

  return (
    <div>
      {getDashboardContent()}
    </div>
  );
}
