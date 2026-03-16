import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/dateUtils';
import { getAvatarUrl } from '@/utils/imageUtils';
import { 
  Trophy, User, Calendar, Eye, 
  Award, BarChart3,
  ChevronLeft, ChevronRight, CheckCircle
} from 'lucide-react';
import { UserRole } from '@/types/auth.types';
import { useNavigate, useLocation } from 'react-router-dom';
import toastService from '@/services/toastService';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import PlayerCard from '@/components/PlayerCard';
import { dashboardService, type DashboardStats, type MonthlyStats, type NextTournament, type PlayerProfile } from '@/services/dashboardService';
import VenueOwnerDashboard from './VenueOwnerDashboard';
import OrganizerDashboardPage from './OrganizerDashboardPage';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  
  // Check for booking success state
  useEffect(() => {
    if (location.state?.bookingSuccess) {
      setShowSuccessBanner(true);
      setBookingDetails({
        venueName: location.state.venueName,
        bookingDate: location.state.bookingDate,
        bookingTime: location.state.bookingTime
      });
      
      // Clear the state to prevent showing banner on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide banner after 10 seconds
      setTimeout(() => {
        setShowSuccessBanner(false);
      }, 10000);
    }
  }, [location]);
  
  // Redirect referees to their specific dashboard
  useEffect(() => {
    if (user?.role === UserRole.REFEREE) {
      navigate('/referee/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // For organizers, render the new dashboard without the main layout
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerDashboardPage />;
  }
  
  // State for dashboard data
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
        profileData
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
        dashboardService.getPlayerProfile().catch(() => null)
      ]);
      
      setStats(dashboardStatsData);
      setMonthlyStats(monthlyStatsData);
      setNextTournament(nextTournamentData);
      setProfile(profileData);
      
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
            {/* Booking Success Banner */}
            {showSuccessBanner && bookingDetails && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      Booking Confirmed! 🎉
                    </h3>
                    <p className="text-sm text-green-800 mb-2">
                      Your venue booking has been successfully confirmed and payment processed.
                    </p>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        📍 {bookingDetails.venueName}
                      </p>
                      <p className="text-sm text-gray-700">
                        📅 {new Date(bookingDetails.bookingDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-gray-700">
                        ⏰ {bookingDetails.bookingTime}
                      </p>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      You'll receive notifications about your booking status. Check your notifications for updates.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuccessBanner(false)}
                    className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

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
                              {formatDate(nextTournament.date)}
                            </span>
                            <span className="text-xs text-gray-400">{nextTournament.venue}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                              {user.profile_picture ? (
                                <img 
                                  src={getAvatarUrl(user.profile_picture)!}
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
                                src="/images/Card Profile-1.png"
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
                            {formatDate(nextTournament.date)}
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

                {/* Sport Rankings Card */}
                {/* Temporarily commented out - not needed currently
                {stats.sport_rankings && Object.keys(stats.sport_rankings).length > 0 && (
                  <SportRankingsCard sportRankings={stats.sport_rankings} />
                )}
                */}

                {/* Venue Bookings Card */}
                {/* Temporarily commented out - not needed currently
                {stats.venue_bookings && (
                  <VenueBookingsCard bookings={stats.venue_bookings} />
                )}
                */}
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

      case UserRole.REFEREE:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name?.split(' ')[0] || 'Referee'}!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage your referee assignments and availability.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
                <Calendar className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-2xl font-bold">{stats.upcomingMatches}</p>
                <p className="text-sm opacity-80">Upcoming Matches</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                <Trophy className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-2xl font-bold">{stats.totalTournaments}</p>
                <p className="text-sm opacity-80">Tournaments Officiated</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                <Award className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-2xl font-bold">{stats.matchesPlayed}</p>
                <p className="text-sm opacity-80">Matches Officiated</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white">
                <BarChart3 className="h-8 w-8 mb-3 opacity-80" />
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-sm opacity-80">Average Rating</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/referee/availability')}
                  className="flex items-center gap-3 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Set Availability</p>
                    <p className="text-sm opacity-80">Update your schedule</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/referee/schedule')}
                  className="flex items-center gap-3 border border-gray-300 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">View Schedule</p>
                    <p className="text-sm text-gray-600">See your assignments</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Upcoming Assignments */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
              
              {nextTournament ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-100 rounded flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{nextTournament.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(nextTournament.date).toLocaleDateString()} • {nextTournament.venue}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmed
                      </span>
                      <button
                        onClick={() => navigate(`/tournaments/${nextTournament.id}`)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No upcoming assignments</p>
                  <button
                    onClick={() => navigate('/referee/availability')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Set Your Availability
                  </button>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Officiated Summer Championship Final</p>
                    <p className="text-xs text-gray-600">2 days ago</p>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Updated availability for next week</p>
                    <p className="text-xs text-gray-600">5 days ago</p>
                  </div>
                </div>
              </div>
            </div>
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
