import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Plus,
  Award,
  Clock,
  XCircle,
  Play,
  Edit,
  BarChart3,
  Filter,
  Search,
  ChevronRight,
  MoreVertical,
  Activity,
  AlertCircle
} from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';

export default function MyTournamentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizedTournaments, setOrganizedTournaments] = useState<Tournament[]>([]);
  const [registeredTournaments, setRegisteredTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'organized' | 'registered'>('organized');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // For organizers, only show organized tournaments
  const isOrganizer = user?.role === 'ORGANIZER';

  useEffect(() => {
    loadMyTournaments();
  }, []);

  const loadMyTournaments = async () => {
    try {
      setLoading(true);
      const response = await tournamentService.getMyTournaments();
      setOrganizedTournaments(response.organized_tournaments);
      setRegisteredTournaments(response.registered_tournaments);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'ONGOING':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'COMPLETED':
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
      case 'CANCELLED':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFilteredTournaments = (tournaments: Tournament[]) => {
    return tournaments.filter(tournament => {
      const matchesSearch = !searchQuery ||
        tournament.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.sport_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || tournament.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const getOrganizerStats = () => {
    const total = organizedTournaments.length;
    const upcoming = organizedTournaments.filter(t => t.status === 'UPCOMING').length;
    const ongoing = organizedTournaments.filter(t => t.status === 'ONGOING').length;
    const completed = organizedTournaments.filter(t => t.status === 'COMPLETED').length;
    const totalParticipants = organizedTournaments.reduce((sum, t) => sum + t.registered_count, 0);

    return { total, upcoming, ongoing, completed, totalParticipants };
  };

  const getPlayerStats = () => {
    const total = registeredTournaments.length;
    const upcoming = registeredTournaments.filter(t => t.status === 'UPCOMING').length;
    const ongoing = registeredTournaments.filter(t => t.status === 'ONGOING').length;
    const completed = registeredTournaments.filter(t => t.status === 'COMPLETED').length;

    return { total, upcoming, ongoing, completed, totalParticipants: 0 };
  };

  const stats = isOrganizer ? getOrganizerStats() : getPlayerStats();
  const currentTournaments = isOrganizer ? organizedTournaments : (activeTab === 'organized' ? organizedTournaments : registeredTournaments);
  const filteredTournaments = getFilteredTournaments(currentTournaments);

  const handleQuickAction = async (action: string, tournamentId: string) => {
    try {
      switch (action) {
        case 'generate_bracket':
          await tournamentService.generateBracket(tournamentId);
          toastService.success('Bracket generated successfully!');
          loadMyTournaments();
          break;
        case 'withdraw':
          if (confirm('Are you sure you want to withdraw from this tournament?')) {
            await tournamentService.withdrawFromTournament(tournamentId);
            toastService.success('Successfully withdrawn from tournament');
            loadMyTournaments();
          }
          break;
        default:
          break;
      }
    } catch (err: any) {
      toastService.error(err.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading your tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Page Header with Stats */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Tournaments</h1>
              <p className="mt-2 text-gray-500 max-w-2xl">
                {user?.role === 'ORGANIZER'
                  ? 'Manage your events, track registrations, and organize brackets.'
                  : 'Track your upcoming matches and tournament history.'
                }
              </p>
            </div>
            {user?.role === 'ORGANIZER' && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="h-5 w-5" />
                Create New Tournament
              </button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600/80">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600/80">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Activity className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-600/80">Active Now</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ongoing}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-600/80">
                    {isOrganizer ? 'Total Participants' : 'Completed'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isOrganizer ? stats.totalParticipants : stats.completed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs (Non-Organizer Only) */}
        {!isOrganizer && (
          <div className="flex items-center gap-8 border-b border-gray-200 mb-8">
            <button
              onClick={() => setActiveTab('organized')}
              className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'organized' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Organized ({organizedTournaments.length})
              {activeTab === 'organized' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('registered')}
              className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'registered' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Participating ({registeredTournaments.length})
              {activeTab === 'registered' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />
              )}
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none appearance-none cursor-pointer shadow-sm text-sm font-medium text-gray-700"
              >
                <option value="">All Status</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <BarChart3 className="h-5 w-5 rotate-90" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredTournaments.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No tournaments found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters to find what you looking for.'
                : 'Create your first tournament to get started with ArenaX.'}
            </p>
            {(isOrganizer && !searchQuery && !statusFilter) && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all font-medium"
              >
                <Plus className="h-5 w-5" />
                Create Tournament
              </button>
            )}
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => {
              const statusStyle = getStatusColor(tournament.status);
              return (
                <div key={tournament.id} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-gray-300 flex flex-col h-full">
                  {/* Image Header */}
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    {tournament.tournament_image ? (
                      <img
                        src={tournament.tournament_image.startsWith('http') ? tournament.tournament_image : `${import.meta.env.VITE_API_URL}${tournament.tournament_image}`}
                        alt={tournament.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <Trophy className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} backdrop-blur-md bg-opacity-90`}>
                        {tournament.status}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-bold text-gray-900 rounded-lg shadow-sm">
                        {tournament.sport_type}
                      </span>
                      <div className="px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-medium text-gray-900 rounded-lg shadow-sm flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(tournament.date)}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {tournament.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="line-clamp-1">{tournament.venue}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">Entry Fee</p>
                        <p className="font-bold text-gray-900">
                          {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">Participants</p>
                        <p className="font-bold text-gray-900">
                          {tournament.registered_count}/{tournament.max_participants}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(isOrganizer || activeTab === 'organized') && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-gray-600">Registration Status</span>
                          <span className="font-bold text-purple-600">
                            {Math.round((tournament.registered_count / tournament.max_participants) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all text-center"
                      >
                        View Details
                      </button>

                      {(isOrganizer || activeTab === 'organized') ? (
                        <button
                          onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                          className="py-2.5 px-4 rounded-xl text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      ) : (
                        tournament.status === 'UPCOMING' && (
                          <button
                            onClick={() => handleQuickAction('withdraw', tournament.id)}
                            className="py-2.5 px-4 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-all flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Leave
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredTournaments.map((tournament) => {
              const statusStyle = getStatusColor(tournament.status);
              return (
                <div key={tournament.id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* List Item Image */}
                    <div className="w-full sm:w-48 h-32 rounded-xl bg-gray-100 relative overflow-hidden shrink-0">
                      {tournament.tournament_image ? (
                        <img
                          src={tournament.tournament_image.startsWith('http') ? tournament.tournament_image : `${import.meta.env.VITE_API_URL}${tournament.tournament_image}`}
                          alt={tournament.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Trophy className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 truncate">
                              {tournament.title}
                            </h3>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              {tournament.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {tournament.venue}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {formatDate(tournament.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/tournaments/${tournament.id}`)}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {(isOrganizer || activeTab === 'organized') && (
                            <button
                              onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Edit Tournament"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          )}
                          {!isOrganizer && tournament.status === 'UPCOMING' && (
                            <button
                              onClick={() => handleQuickAction('withdraw', tournament.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Withdraw"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Sport</p>
                          <p className="font-semibold text-gray-900">{tournament.sport_type}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Entry Fee</p>
                          <p className="font-semibold text-gray-900">
                            {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-gray-500">Participants</p>
                            <span className="text-xs font-bold text-gray-900">
                              {tournament.registered_count}/{tournament.max_participants}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-gray-900 h-1.5 rounded-full"
                              style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}