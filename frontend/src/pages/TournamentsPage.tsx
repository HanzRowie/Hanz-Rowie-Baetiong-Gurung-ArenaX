import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Trophy,
  DollarSign,
  Plus,
  Eye,
  UserPlus,
  Clock,
  X,
  ChevronDown,
  Settings,
  SlidersHorizontal,
  Grid,
  List,
  ArrowUpDown,
} from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament, TournamentFilters } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';
import QuickTeamRegistrationModal from '@/components/player/QuickTeamRegistrationModal';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default function TournamentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Enhanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTournamentType, setSelectedTournamentType] = useState('');
  const [selectedRegistrationType, setSelectedRegistrationType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [maxEntryFee, setMaxEntryFee] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // View and sorting options
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'participants' | 'entry_fee'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Team registration modal
  const [teamRegistrationModal, setTeamRegistrationModal] = useState<{
    isOpen: boolean;
    tournament: Tournament | null;
  }>({ isOpen: false, tournament: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [hasMore, setHasMore] = useState(true);

  const sportTypes = [
    'FUTSAL', 'BADMINTON'
  ];

  const formatSportName = (sport: string) => {
    return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
  };

  const statusOptions = [
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'ONGOING', label: 'Ongoing' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  // Tournament type is now fixed to single elimination only
  const tournamentTypeOptions = [
    { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' }
  ];

  const registrationTypeOptions = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'TEAM', label: 'Team' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'title', label: 'Title' },
    { value: 'participants', label: 'Participants' },
    { value: 'entry_fee', label: 'Entry Fee' }
  ];

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((_query: string) => {
      setCurrentPage(1);
      loadTournaments(true);
    }, 300),
    []
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      setCurrentPage(1);
      loadTournaments(true);
    }
  }, [searchQuery, selectedSport, selectedStatus, selectedTournamentType, selectedRegistrationType, selectedLocation, maxEntryFee, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    loadTournaments(true);
  }, [currentPage]);

  const loadTournaments = async (reset = false) => {
    try {
      setLoading(true);
      const filters: TournamentFilters = {
        search: searchQuery || undefined,
        sport_type: selectedSport || undefined,
        status: selectedStatus || undefined,
        tournament_type: selectedTournamentType || undefined,
        registration_type: selectedRegistrationType || undefined,
        location: selectedLocation || undefined,
        entry_fee_max: maxEntryFee ? parseFloat(maxEntryFee) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      console.log('Tournament filters being sent:', filters); // Debug log

      const response = await tournamentService.getTournaments({
        ...filters,
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      } as TournamentFilters);

      if (reset) {
        setTournaments(response.tournaments);
      } else {
        setTournaments(prev => [...prev, ...response.tournaments]);
      }

      setTotalCount(response.count);
      setHasMore(response.tournaments.length === pageSize);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleRegister = async (tournamentId: string) => {
    try {
      console.log('Attempting to register for tournament:', tournamentId);
      await tournamentService.registerForTournament(tournamentId);
      // Reload tournaments to update registration count
      loadTournaments(true);
      toastService.success('Successfully registered for tournament!');
    } catch (err: any) {
      console.error('Tournament registration error:', err);
      toastService.error(err.message || 'Failed to register for tournament');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSport('');
    setSelectedStatus('');
    setSelectedTournamentType('');
    setSelectedRegistrationType('');
    setSelectedLocation('');
    setMaxEntryFee('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const getRoleBasedActions = (tournament: Tournament) => {
    if (user?.role === 'ORGANIZER' && tournament.organizer.id === user.id) {
      return (
        <button
          onClick={() => navigate(`/tournaments/${tournament.id}/manage`)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Manage
        </button>
      );
    }

    if (user?.role === 'PLAYER') {
      // For team tournaments, check team registration status
      if (tournament.registration_type === 'TEAM') {
        // Check if user has any teams registered for this tournament
        if (tournament.user_registration_status === 'PENDING') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg cursor-not-allowed"
            >
              <Clock className="h-4 w-4" />
              Team Pending
            </button>
          );
        }

        if (tournament.user_registration_status === 'ACCEPTED') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg cursor-not-allowed"
            >
              <Trophy className="h-4 w-4" />
              Team Registered
            </button>
          );
        }

        if (tournament.user_registration_status === 'REJECTED') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              Team Rejected
            </button>
          );
        }

        if (!tournament.user_registration_status && tournament.is_registration_open) {
          return (
            <button
              onClick={() => setTeamRegistrationModal({ isOpen: true, tournament })}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              Register Team
            </button>
          );
        }

        if (!tournament.user_registration_status && !tournament.is_registration_open) {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              Registration Closed
            </button>
          );
        }
      } else {
        // Individual tournament logic
        if (tournament.user_registration_status === 'PENDING') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg cursor-not-allowed"
            >
              <Clock className="h-4 w-4" />
              Pending
            </button>
          );
        }

        if (tournament.user_registration_status === 'ACCEPTED') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg cursor-not-allowed"
            >
              <Trophy className="h-4 w-4" />
              Registered
            </button>
          );
        }

        if (tournament.user_registration_status === 'REJECTED') {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              Rejected
            </button>
          );
        }

        if (!tournament.user_registration_status && tournament.is_registration_open) {
          return (
            <button
              onClick={() => handleRegister(tournament.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          );
        }

        if (!tournament.user_registration_status && !tournament.is_registration_open) {
          return (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              Closed
            </button>
          );
        }
      }
    }

    return null;
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header with title and view controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
              <p className="text-sm text-gray-500">
                Discover and join {totalCount} tournaments across various sports
              </p>
            </div>
            {user?.role === 'ORGANIZER' && (
              <button
                onClick={() => navigate('/tournaments/create')}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Tournament
              </button>
            )}

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortOrder(order as any);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  {sortOptions.map(option => (
                    <optgroup key={option.value} label={option.label}>
                      <option value={`${option.value}-asc`}>{option.label} (A-Z)</option>
                      <option value={`${option.value}-desc`}>{option.label} (Z-A)</option>
                    </optgroup>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tournaments by name, sport, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">All Sports</option>
                  {sportTypes.map((sport) => (
                    <option key={sport} value={sport}>{formatSportName(sport)}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>

                <select
                  value={selectedRegistrationType}
                  onChange={(e) => setSelectedRegistrationType(e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">All Types</option>
                  {registrationTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  Advanced
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Type</label>
                    <select
                      value={selectedTournamentType}
                      onChange={(e) => setSelectedTournamentType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                      <option value="">All Types</option>
                      {tournamentTypeOptions.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="Enter location"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Entry Fee</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={maxEntryFee}
                      onChange={(e) => setMaxEntryFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading / Empty / Tournament Grid/List */}
          {loading && currentPage === 1 ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tournaments found</h3>
              <p className="text-sm text-gray-600 mb-4">
                Try adjusting your search filters or check back later.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tournament Grid/List */}
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {tournaments.map((tournament) => (
                  viewMode === 'grid' ? (
                    // Grid View Card
                    <div
                      key={tournament.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Tournament Image */}
                      {tournament.tournament_image ? (
                        <img
                          src={tournament.tournament_image}
                          alt={tournament.title}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                          <Trophy className="h-16 w-16 text-white" />
                        </div>
                      )}

                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{tournament.title}</h3>
                            <p className="text-sm text-gray-500">{formatSportName(tournament.sport_type)}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                            {tournament.status}
                          </span>
                        </div>

                        {/* Description */}
                        {tournament.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {tournament.description}
                          </p>
                        )}

                        {/* Details */}
                        <div className="space-y-2 mb-4">
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

                        {/* Organizer */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                          {tournament.organizer.profile_picture ? (
                            <img
                              src={tournament.organizer.profile_picture}
                              alt={tournament.organizer.name}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-purple-600">
                                {tournament.organizer.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-600">by {tournament.organizer.name}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/tournaments/${tournament.id}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>

                          {getRoleBasedActions(tournament)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // List View Card
                    <div
                      key={tournament.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-6">
                        {/* Tournament Image */}
                        <div className="flex-shrink-0">
                          {tournament.tournament_image ? (
                            <img
                              src={tournament.tournament_image}
                              alt={tournament.title}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                              <Trophy className="h-8 w-8 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 mb-1">{tournament.title}</h3>
                              <p className="text-sm text-gray-500">{formatSportName(tournament.sport_type)} • {tournament.tournament_type.replace('_', ' ')}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                              {tournament.status}
                            </span>
                          </div>

                          {tournament.description && (
                            <p className="text-gray-600 mb-4 line-clamp-2">{tournament.description}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(tournament.date)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{tournament.venue}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>{tournament.registered_count}/{tournament.max_participants}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>{tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {tournament.organizer.profile_picture ? (
                                <img
                                  src={tournament.organizer.profile_picture}
                                  alt={tournament.organizer.name}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-purple-600">
                                    {tournament.organizer.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-gray-600">by {tournament.organizer.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/tournaments/${tournament.id}`)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>

                              {getRoleBasedActions(tournament)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </div>
                    ) : (
                      'Load More Tournaments'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      {/* Team Registration Modal */}
      {teamRegistrationModal.tournament && (
        <QuickTeamRegistrationModal
          isOpen={teamRegistrationModal.isOpen}
          onClose={() => setTeamRegistrationModal({ isOpen: false, tournament: null })}
          tournament={{
            id: teamRegistrationModal.tournament.id,
            title: teamRegistrationModal.tournament.title,
            sport_type: teamRegistrationModal.tournament.sport_type,
            registration_type: teamRegistrationModal.tournament.registration_type
          }}
          onSuccess={() => {
            loadTournaments(true);
          }}
        />
      )}
    </div>
  );
}