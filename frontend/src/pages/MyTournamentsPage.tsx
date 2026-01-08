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

  const currentTournaments = activeTab === 'organized' ? organizedTournaments : registeredTournaments;
  const filteredTournaments = getFilteredTournaments(currentTournaments);
  const stats = activeTab === 'organized' ? getOrganizerStats() : getPlayerStats();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">ArenaX</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/tournaments')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Browse Tournaments
              </button>
              {user?.role === 'ORGANIZER' && (
                <button
                  onClick={() => navigate('/tournaments/create')}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Tournament
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tournaments</h1>
            <p className="text-sm text-gray-500">
              Manage your tournaments and track your participation
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Trophy className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Tournaments</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Upcoming</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.upcoming}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Play className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ongoing</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.ongoing}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    {activeTab === 'organized' ? 'Total Participants' : 'Completed'}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {activeTab === 'organized' ? stats.totalParticipants : stats.completed}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('organized')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'organized'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Organized ({organizedTournaments.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('registered')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'registered'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Registered ({registeredTournaments.length})
                  </div>
                </button>
              </nav>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tournaments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tournament List */}
            <div className="p-6">
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {currentTournaments.length === 0 
                      ? `No ${activeTab} tournaments yet`
                      : 'No tournaments match your filters'
                    }
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === 'organized' 
                      ? 'Create your first tournament to get started'
                      : 'Register for tournaments to see them here'
                    }
                  </p>
                  {activeTab === 'organized' && user?.role === 'ORGANIZER' && (
                    <button
                      onClick={() => navigate('/tournaments/create')}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Create Tournament
                    </button>
                  )}
                  {activeTab === 'registered' && (
                    <button
                      onClick={() => navigate('/tournaments')}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Browse Tournaments
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{tournament.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                              {tournament.status}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              {tournament.sport_type}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(tournament.date)} at {formatTime(tournament.start_time)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{tournament.venue}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>{tournament.registered_count}/{tournament.max_participants} participants</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>{tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}</span>
                            </div>
                          </div>

                          {/* Progress Bar for Organizers */}
                          {activeTab === 'organized' && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                <span>Registration Progress</span>
                                <span>{tournament.registered_count}/{tournament.max_participants}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
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
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>

                          {activeTab === 'organized' && (
                            <>
                              <button
                                onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                                className="flex items-center gap-2 px-3 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>

                              {tournament.status === 'UPCOMING' && tournament.registered_count >= tournament.min_participants && (
                                <button
                                  onClick={() => handleQuickAction('generate_bracket', tournament.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                                >
                                  <Play className="h-4 w-4" />
                                  Generate Bracket
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/tournaments/${tournament.id}/analytics`)}
                                className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <BarChart3 className="h-4 w-4" />
                                Analytics
                              </button>
                            </>
                          )}

                          {activeTab === 'registered' && tournament.status === 'UPCOMING' && (
                            <button
                              onClick={() => handleQuickAction('withdraw', tournament.id)}
                              className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                              Withdraw
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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