import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Settings,
  Plus,
  Award,
  Clock,
  XCircle,
  Play,
  Edit,
  BarChart3,
  Filter,
  Search,
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
      case 'UPCOMING': return 'bg-blue-100 text-blue-800';
      case 'ONGOING': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tournaments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Tournaments</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadMyTournaments}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 pb-20">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Enhanced Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tournaments</h1>
              <p className="text-gray-600">
                {user?.role === 'ORGANIZER' 
                  ? 'Manage and track your organized tournaments'
                  : 'View your tournament registrations and participation'
                }
              </p>
            </div>
            {user?.role === 'ORGANIZER' && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                Create Tournament
              </button>
            )}
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
              <p className="text-sm font-medium text-gray-600">Total Tournaments</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.upcoming}</span>
              </div>
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-xs text-gray-500 mt-1">Not yet started</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Play className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.ongoing}</span>
              </div>
              <p className="text-sm font-medium text-gray-600">Ongoing</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {isOrganizer ? stats.totalParticipants : stats.completed}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">
                {isOrganizer ? 'Total Participants' : 'Completed'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isOrganizer ? 'Across all tournaments' : 'Finished tournaments'}
              </p>
            </div>
          </div>

          {/* Tabs and Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Tab Navigation - Only show for non-organizers */}
            {!isOrganizer && (
              <div className="border-b border-gray-200 px-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('organized')}
                    className={`relative py-4 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'organized'
                        ? 'text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Organized
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        activeTab === 'organized' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {organizedTournaments.length}
                      </span>
                    </div>
                    {activeTab === 'organized' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('registered')}
                    className={`relative py-4 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'registered'
                        ? 'text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Registered
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        activeTab === 'registered' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {registeredTournaments.length}
                      </span>
                    </div>
                    {activeTab === 'registered' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
                    )}
                  </button>
                </nav>
              </div>
            )}

            {/* For organizers, show a simple header */}
            {isOrganizer && (
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Your Tournaments</h2>
              </div>
            )}

            {/* Enhanced Filters */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tournaments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ONGOING">Ongoing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-white border border-gray-300 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Trophy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament List */}
            <div className="p-6">
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                    <Trophy className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentTournaments.length === 0 
                      ? (isOrganizer ? 'No tournaments yet' : `No ${activeTab} tournaments yet`)
                      : 'No tournaments match your filters'
                    }
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {isOrganizer
                      ? 'Create your first tournament and start building your sports community'
                      : activeTab === 'organized' 
                        ? 'Create your first tournament and start building your sports community'
                        : 'Register for tournaments to track your participation and compete'
                    }
                  </p>
                  {(isOrganizer || activeTab === 'organized') && user?.role === 'ORGANIZER' && (
                    <button
                      onClick={() => navigate('/tournaments/create')}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      <Plus className="h-5 w-5" />
                      Create Your First Tournament
                    </button>
                  )}
                  {activeTab === 'registered' && (
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      <Trophy className="h-5 w-5" />
                      Browse Tournaments
                    </button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                  : "space-y-4"
                }>
                  {filteredTournaments.map((tournament) => (
                    viewMode === 'grid' ? (
                      <div key={tournament.id} className="group">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-purple-200 hover:-translate-y-1">
                          {/* Tournament Image/Header */}
                          <div className="h-48 bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 relative overflow-hidden">
                            {tournament.tournament_image ? (
                              <img 
                                src={tournament.tournament_image.startsWith('http') ? tournament.tournament_image : `${import.meta.env.VITE_API_URL}${tournament.tournament_image}`} 
                                alt={tournament.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Trophy className="h-16 w-16 text-indigo-300" />
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className="absolute top-4 left-4">
                              <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(tournament.status)}`}>
                                {tournament.status}
                              </span>
                            </div>

                            {/* Sport Type Badge */}
                            <div className="absolute bottom-4 left-4">
                              <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-semibold text-gray-800 rounded-full shadow-sm">
                                {tournament.sport_type}
                              </span>
                            </div>

                            {/* Date Badge */}
                            <div className="absolute bottom-4 right-4">
                              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
                                <Calendar className="h-3.5 w-3.5 text-gray-600" />
                                <span className="text-xs font-semibold text-gray-800">{formatDate(tournament.date)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Tournament Info */}
                          <div className="p-5">
                            <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                              {tournament.title}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-gray-600 mb-4">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm line-clamp-1">{tournament.venue}</span>
                            </div>

                            {/* Key Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Entry Fee</p>
                                  <p className="font-semibold text-sm text-gray-900">NPR {tournament.entry_fee}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Users className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Participants</p>
                                  <p className="font-semibold text-sm text-gray-900">{tournament.registered_count}/{tournament.max_participants}</p>
                                </div>
                              </div>
                            </div>

                            {/* Registration Progress */}
                            {activeTab === 'organized' && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium text-gray-600">Registration</span>
                                  <span className="text-xs text-gray-500">
                                    {Math.min((tournament.registered_count / tournament.max_participants) * 100, 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => navigate(`/tournaments/${tournament.id}`)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </button>

                              {(isOrganizer || activeTab === 'organized') && (
                                <>
                                  <button
                                    onClick={() => navigate(`/tournaments/${tournament.id}/manage`)}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-purple-200 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-50 transition-all"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {!isOrganizer && activeTab === 'registered' && tournament.status === 'UPCOMING' && (
                                <button
                                  onClick={() => handleQuickAction('withdraw', tournament.id)}
                                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // List View
                      <div
                        key={tournament.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all hover:border-purple-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">{tournament.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                                {tournament.status}
                              </span>
                              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                                {tournament.sport_type}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{formatDate(tournament.date)} at {formatTime(tournament.start_time)}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{tournament.venue}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span>{tournament.registered_count}/{tournament.max_participants} participants</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>{tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}</span>
                              </div>
                            </div>

                            {/* Progress Bar for Organizers */}
                            {(isOrganizer || activeTab === 'organized') && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                  <span className="font-medium">Registration Progress</span>
                                  <span className="font-semibold">{tournament.registered_count}/{tournament.max_participants}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-6">
                            <button
                              onClick={() => navigate(`/tournaments/${tournament.id}`)}
                              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>

                            {(isOrganizer || activeTab === 'organized') && (
                              <>
                                <button
                                  onClick={() => navigate(`/tournaments/${tournament.id}/manage`)}
                                  className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  <Settings className="h-4 w-4" />
                                  Manage
                                </button>

                                <button
                                  onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                                  className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>

                                {tournament.status === 'UPCOMING' && tournament.registered_count >= (tournament.min_participants || 2) && (
                                  <button
                                    onClick={() => handleQuickAction('generate_bracket', tournament.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                  >
                                    <Play className="h-4 w-4" />
                                    Generate Bracket
                                  </button>
                                )}
                              </>
                            )}

                            {!isOrganizer && activeTab === 'registered' && tournament.status === 'UPCOMING' && (
                              <button
                                onClick={() => handleQuickAction('withdraw', tournament.id)}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}