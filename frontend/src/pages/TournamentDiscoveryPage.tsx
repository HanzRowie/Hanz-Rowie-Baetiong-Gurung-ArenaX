import { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  List,
  ArrowUpDown,
  Clock,
  Trophy,
  Zap,
  Star,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import TournamentDiscoveryCard from '@/components/player/TournamentDiscoveryCard';
import TournamentFilters, { type TournamentFilterOptions } from '@/components/player/TournamentFilters';
import TournamentDetailModal from '@/components/player/TournamentDetailModal';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament } from '@/types';
import toastService from '@/services/toastService';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Date (Earliest First)' },
  { value: 'date-desc', label: 'Date (Latest First)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'participants-desc', label: 'Most Popular' },
  { value: 'entry_fee-asc', label: 'Lowest Entry Fee' },
  { value: 'entry_fee-desc', label: 'Highest Entry Fee' },
];

export default function TournamentDiscoveryPage() {
  // State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // View and sorting
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('date-asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 12;
  
  // Filters
  const [filters, setFilters] = useState<TournamentFilterOptions>({
    search: '',
    sportType: '',
    skillLevel: '',
    location: '',
    maxEntryFee: '',
    dateFrom: '',
    dateTo: '',
    tournamentType: '',
    status: '',
    prizePoolMin: '',
    maxParticipants: '',
    featured: false,
    popular: false,
    freeOnly: false,
  });
  
  // Modal state
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Bookmarks (in real app, this would be persisted)
  const [bookmarkedTournaments, setBookmarkedTournaments] = useState<Set<string>>(new Set());

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      setCurrentPage(1);
      loadTournaments(true);
    }, 300),
    [filters, sortBy]
  );

  useEffect(() => {
    debouncedSearch();
  }, [filters, sortBy]);

  useEffect(() => {
    if (currentPage > 1) {
      loadTournaments(false);
    }
  }, [currentPage]);

  const loadTournaments = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const [sortField, sortOrder] = sortBy.split('-');
      
      const apiFilters = {
        search: filters.search || undefined,
        sport_type: filters.sportType || undefined,
        status: filters.status || undefined,
        tournament_type: filters.tournamentType || undefined,
        location: filters.location || undefined,
        entry_fee_max: filters.maxEntryFee ? parseFloat(filters.maxEntryFee) : undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        page: reset ? 1 : currentPage,
        page_size: pageSize,
        sort_by: sortField,
        sort_order: sortOrder,
      };
      
      const response = await tournamentService.getTournaments(apiFilters);
      
      let filteredTournaments = response.tournaments;
      
      // Apply client-side filters that aren't supported by API
      if (filters.featured) {
        filteredTournaments = filteredTournaments.filter(t => 
          t.prize_pool && parseFloat(t.prize_pool) > 10000
        );
      }
      
      if (filters.popular) {
        filteredTournaments = filteredTournaments.filter(t => 
          (t.registered_count / t.max_participants) > 0.7
        );
      }
      
      if (filters.freeOnly) {
        filteredTournaments = filteredTournaments.filter(t => 
          t.entry_fee === '0.00'
        );
      }
      
      if (filters.prizePoolMin) {
        const minPrize = parseFloat(filters.prizePoolMin);
        filteredTournaments = filteredTournaments.filter(t => 
          t.prize_pool && parseFloat(t.prize_pool) >= minPrize
        );
      }
      
      if (filters.maxParticipants) {
        const maxParticipants = parseInt(filters.maxParticipants);
        filteredTournaments = filteredTournaments.filter(t => 
          t.max_participants <= maxParticipants
        );
      }
      
      if (reset) {
        setTournaments(filteredTournaments);
      } else {
        setTournaments(prev => [...prev, ...filteredTournaments]);
      }
      
      setTotalCount(filteredTournaments.length);
      setHasMore(filteredTournaments.length === pageSize);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load tournaments');
      toastService.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: TournamentFilterOptions) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      sportType: '',
      skillLevel: '',
      location: '',
      maxEntryFee: '',
      dateFrom: '',
      dateTo: '',
      tournamentType: '',
      status: '',
      prizePoolMin: '',
      maxParticipants: '',
      featured: false,
      popular: false,
      freeOnly: false,
    });
  };

  const handleRegister = async (tournamentId: string) => {
    try {
      await tournamentService.registerForTournament(tournamentId);
      // Reload tournaments to update registration status
      loadTournaments(true);
      toastService.success('Successfully registered for tournament!');
    } catch (err: any) {
      toastService.error(err.message || 'Failed to register for tournament');
      throw err;
    }
  };

  const handleTournamentClick = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowDetailModal(true);
  };

  const handleBookmark = (tournament: Tournament) => {
    const newBookmarks = new Set(bookmarkedTournaments);
    if (newBookmarks.has(tournament.id)) {
      newBookmarks.delete(tournament.id);
      toastService.success('Removed from bookmarks');
    } else {
      newBookmarks.add(tournament.id);
      toastService.success('Added to bookmarks');
    }
    setBookmarkedTournaments(newBookmarks);
  };

  const handleShare = (tournament: Tournament) => {
    const url = `${window.location.origin}/tournaments/${tournament.id}`;
    if (navigator.share) {
      navigator.share({
        title: tournament.title,
        text: `Check out this ${tournament.sport_type} tournament!`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toastService.success('Tournament link copied to clipboard!');
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Tournaments</h1>
              <p className="text-gray-600 mt-1">
                Find and join tournaments that match your interests and skill level
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Filters */}
          <TournamentFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            totalResults={totalCount}
            loading={loading}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                  <p className="text-sm text-gray-600">Total Tournaments</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournaments.filter(t => t.prize_pool && parseFloat(t.prize_pool) > 10000).length}
                  </p>
                  <p className="text-sm text-gray-600">Featured</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournaments.filter(t => (t.registered_count / t.max_participants) > 0.7).length}
                  </p>
                  <p className="text-sm text-gray-600">Popular</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournaments.filter(t => t.status === 'UPCOMING').length}
                  </p>
                  <p className="text-sm text-gray-600">Upcoming</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="p-4 border-red-200 bg-red-50">
              <p className="text-red-700 text-sm">{error}</p>
            </Card>
          )}

          {/* Tournament Grid/List */}
          {loading && currentPage === 1 ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-gray-300">
              <Trophy className="mx-auto h-16 w-16 text-gray-300 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tournaments found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search filters or check back later for new tournaments.
              </p>
              <Button onClick={handleClearFilters} variant="secondary">
                Clear All Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Tournament Grid/List */}
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {tournaments.map((tournament) => (
                  <div key={tournament.id} onClick={() => handleTournamentClick(tournament)}>
                    <TournamentDiscoveryCard
                      tournament={tournament}
                      onRegister={handleRegister}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="secondary"
                    size="lg"
                    className="px-8"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Loading...
                      </div>
                    ) : (
                      'Load More Tournaments'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tournament Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTournament(null);
        }}
        onRegister={handleRegister}
        onShare={handleShare}
        onBookmark={handleBookmark}
        isBookmarked={selectedTournament ? bookmarkedTournaments.has(selectedTournament.id) : false}
      />
    </div>
  );
}