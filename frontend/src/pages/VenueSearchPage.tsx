import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star,
  Users, Building2, Heart,
  Grid3X3, List, SlidersHorizontal,
  Check, Coffee, Wifi, Car, Zap, Trophy, Calendar, Clock
} from 'lucide-react';
import toastService from '@/services/toastService';
import { venueService } from '@/services/venueService';
import { api } from '@/services/api';
import BottomNavigation from '@/components/BottomNavigation';

export default function VenueSearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    sport_type: '',
    capacity_min: 0,
    capacity_max: 0,
    price_min: 0,
    price_max: 0,
    available_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSport, setActiveSport] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevant');
  const [activeTab, setActiveTab] = useState<'find' | 'bookings'>('find');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      setBookingsLoading(true);
      api.get('/api/venues/my-bookings/')
        .then(res => setMyBookings(res.data.bookings || []))
        .catch(() => setMyBookings([]))
        .finally(() => setBookingsLoading(false));
    }
  }, [activeTab, user]);

  useEffect(() => {
    // Determine if we should redirect based on auth
    // For a public search page, we might not strictly enforce auth, 
    // but the original code did. I'll keep it safe.
    if (!user && !loading) {
      // navigate('/login'); // Optional: Uncomment if strictly protected
    }
    loadVenues();
  }, [user, navigate]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venueService.getVenues(filters);

      if (Array.isArray(response)) {
        setVenues(response);
      } else if (response && Array.isArray(response.venues)) {
        setVenues(response.venues);
      } else {
        setVenues([]);
      }
    } catch (error) {
      console.error('Error loading venues:', error);
      toastService.error('Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadVenues();
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleFavorite = (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(venueId)
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  };

  const filteredVenues = Array.isArray(venues) ? venues.filter(venue => {
    const matchesSearch =
      venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.sport_types?.some((sport: string) => sport.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSportTab = activeSport === 'all' ||
      venue.sport_types?.some((sport: string) => sport.toLowerCase() === activeSport.toLowerCase());

    return matchesSearch && matchesSportTab;
  }) : [];

  // Sort venues based on selected sort option
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.price_per_hour || 0) - (b.price_per_hour || 0);
      case 'price-high':
        return (b.price_per_hour || 0) - (a.price_per_hour || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'relevant':
      default:
        return 0; // Keep original order
    }
  });

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="h-3 w-3" />;
    if (lower.includes('park')) return <Car className="h-3 w-3" />;
    if (lower.includes('cafe') || lower.includes('food')) return <Coffee className="h-3 w-3" />;
    if (lower.includes('changed') || lower.includes('shower')) return <Zap className="h-3 w-3" />;
    return <Check className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Finding the best venues nearby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-purple-100 pt-8 pb-6 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-purple-900 tracking-tight">Venues</h1>
              <p className="mt-2 text-gray-500 max-w-2xl">
                Discover world-class facilities for your next match or tournament.
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          {user && (
            <div className="flex border-b border-gray-200 -mb-6 mb-2">
              <button
                onClick={() => setActiveTab('find')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'find' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Find Venues
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                My Bookings
              </button>
            </div>
          )}

          {/* Search & Main Filters */}
          <div className="flex flex-col lg:flex-row gap-4">            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
              <input
                type="text"
                placeholder="Search by name, location, or sport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-sm text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-3.5 border rounded-xl transition-all font-medium whitespace-nowrap ${showFilters
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
                  }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filters
              </button>

              <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center shadow-sm shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 p-6 bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Refine Search</h3>
                <button
                  onClick={() => setFilters({
                    location: '', sport_type: '', capacity_min: 0, capacity_max: 0,
                    price_min: 0, price_max: 0, available_date: ''
                  })}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Reset All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                      placeholder="Enter city..."
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sport</label>
                  <select
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all appearance-none cursor-pointer"
                    value={filters.sport_type}
                    onChange={(e) => handleFilterChange('sport_type', e.target.value)}
                  >
                    <option value="">All Sports</option>
                    <option value="futsal">Futsal</option>
                    <option value="badminton">Badminton</option>
                    <option value="basketball">Basketball</option>
                    <option value="cricket">Cricket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Price Range (/hr)</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">NPR</span>
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
                        value={filters.price_min || ''}
                        onChange={(e) => handleFilterChange('price_min', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">NPR</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm"
                        value={filters.price_max || ''}
                        onChange={(e) => handleFilterChange('price_max', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md shadow-purple-200 transition-all active:scale-95"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sport Categories Tabs */}
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'all', label: 'All Venues', icon: Building2 },
              { id: 'futsal', label: 'Futsal', icon: Trophy },
              { id: 'badminton', label: 'Badminton', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSport(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${activeSport === tab.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200 hover:text-purple-600 hover:bg-purple-50'
                  }`}
              >
                {tab.id !== 'all' && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* My Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {bookingsLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">No bookings yet</p>
              <p className="text-sm text-gray-400 mb-4">Book a venue from the Find Venues tab.</p>
              <button onClick={() => setActiveTab('find')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">Find a Venue</button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((b: any) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{b.venue_details?.name || b.venue_name || 'Venue'}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5"><MapPin className="w-3.5 h-3.5" /><span>{b.venue_details?.location || b.venue_location || '—'}</span></div>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-purple-400" />{b.date}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-purple-400" />{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</span>
                        {b.purpose && <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-purple-400" />{b.purpose}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                      {b.amount && <p className="text-base font-bold text-gray-900 mt-1.5">NPR {parseFloat(b.amount).toLocaleString()}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'find' && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-500 font-medium">
            Found <span className="text-gray-900 font-bold">{filteredVenues.length}</span> venues nearby
          </p>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-600 border-none outline-none cursor-pointer hover:text-purple-600 focus:ring-0"
          >
            <option value="relevant">Most Relevant</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {sortedVenues.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-purple-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">
              We couldn't find any venues matching your criteria. Try adjusting your filters or search term.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({ location: '', sport_type: '', capacity_min: 0, capacity_max: 0, price_min: 0, price_max: 0, available_date: '' });
                setActiveSport('all');
              }}
              className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all font-medium shadow-lg shadow-purple-200"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
            {sortedVenues.map((venue) => (
              viewMode === 'grid' ? (
                // GRID VIEW CARD
                <div
                  key={venue.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col cursor-pointer"
                  onClick={() => navigate(`/venues/${venue.id}`)}
                >
                  <div className="h-56 relative overflow-hidden bg-gray-100">
                    {venue.images && venue.images.length > 0 ? (
                      <img
                        src={venue.images[0]}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50">
                        <Building2 className="h-12 w-12 text-purple-200" />
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {venue.sport_types?.slice(0, 2).map((sport: string) => (
                        <span key={sport} className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-xs font-bold text-purple-900 rounded-lg shadow-sm uppercase tracking-wide border border-purple-100">
                          {sport}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(e, venue.id)}
                      className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full hover:bg-white transition-colors border border-purple-100 shadow-sm group-hover:scale-105"
                    >
                      <Heart className={`h-5 w-5 ${favorites.includes(venue.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                    </button>

                    {venue.rating && (
                      <div className="absolute bottom-4 right-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-purple-100">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-900">{venue.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                        {venue.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                      <MapPin className="h-4 w-4 shrink-0 text-purple-400" />
                      <span className="line-clamp-1 group-hover:text-gray-700 transition-colors">{venue.location}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {venue.amenities?.slice(0, 3).map((amenity: string) => (
                        <div key={amenity} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </div>
                      ))}
                      {venue.amenities?.length > 3 && (
                        <span className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium border border-gray-100">
                          +{venue.amenities.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-5 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-0.5">Starting from</p>
                        <p className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                          NPR {venue.price_per_hour}
                          <span className="text-sm font-normal text-gray-400">/hr</span>
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/venues/${venue.id}/book`);
                        }}
                        className="px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 active:scale-95"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // LIST VIEW CARD
                <div
                  key={venue.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:border-purple-200 cursor-pointer group"
                  onClick={() => navigate(`/venues/${venue.id}`)}
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-64 h-40 rounded-xl bg-gray-100 relative overflow-hidden shrink-0">
                      {venue.images && venue.images.length > 0 ? (
                        <img
                          src={venue.images[0]}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300 bg-gray-50">
                          <Building2 className="h-8 w-8 text-purple-200" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-xs font-bold text-purple-900 rounded-lg shadow-sm border border-purple-100">
                          {venue.sport_types?.[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{venue.name}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-4 w-4 shrink-0 text-purple-400" />
                            {venue.location}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {venue.rating && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-100">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              <span className="text-sm font-bold text-amber-700">{venue.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(e, venue.id)}
                            className={`p-1.5 rounded-full hover:bg-red-50 transition-colors ${favorites.includes(venue.id) ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
                          >
                            <Heart className={`h-5 w-5 ${favorites.includes(venue.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                        {venue.description || 'No description available.'}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-purple-400" />
                            Up to {venue.capacity}
                          </div>
                          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-purple-400" />
                            {venue.total_bookings || 0} bookings
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <p className="text-lg font-bold text-gray-900">
                            NPR {venue.price_per_hour}<span className="text-sm font-normal text-gray-400">/hr</span>
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/venues/${venue.id}/book`);
                            }}
                            className="px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 active:scale-95 ml-2"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
      )}

      <BottomNavigation />
    </div>
  );
}
const Activity = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);