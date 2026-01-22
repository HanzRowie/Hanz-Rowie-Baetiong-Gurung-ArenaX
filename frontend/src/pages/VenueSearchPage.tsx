import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, DollarSign, Star,
  Users, Building2, Heart,
  Grid3X3, List, SlidersHorizontal
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import toastService from '@/services/toastService';
import { venueService } from '@/services/venueService';
import VenueCard from '@/components/VenueCard';

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

  useEffect(() => {
    if (user) {
      loadVenues();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      console.log('Loading venues with filters:', filters);
      const response = await venueService.getVenues(filters);
      console.log('Venues API response:', response);
      
      // Handle different response structures
      if (Array.isArray(response)) {
        setVenues(response);
      } else if (response && Array.isArray(response.venues)) {
        setVenues(response.venues);
      } else if (response && Array.isArray(response.data)) {
        setVenues(response.data);
      } else {
        console.warn('Unexpected venues response structure:', response);
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

  const toggleFavorite = (venueId: string) => {
    setFavorites(prev =>
      prev.includes(venueId)
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  };

  const filteredVenues = Array.isArray(venues) ? venues.filter(venue =>
    venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.sport_types?.some((sport: string) => sport.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Venues</h1>
        <p className="text-gray-500 text-sm mt-1">
          Discover and book the perfect venues for your tournaments
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Main Search */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search venues by name, location, or sport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${showFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            Filters
          </button>
          <button
            onClick={handleSearch}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="City or area (e.g., Singapore, Kuala Lumpur)"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sport Type</label>
                <select
                  value={filters.sport_type}
                  onChange={(e) => handleFilterChange('sport_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All Sports</option>
                  <option value="badminton">Badminton</option>
                  <option value="futsal">Futsal</option>
                  <option value="basketball">Basketball</option>
                  <option value="tennis">Tennis</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.capacity_min || ''}
                    onChange={(e) => handleFilterChange('capacity_min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.capacity_max || ''}
                    onChange={(e) => handleFilterChange('capacity_max', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range ($/hour)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.price_min || ''}
                    onChange={(e) => handleFilterChange('price_min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.price_max || ''}
                    onChange={(e) => handleFilterChange('price_max', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
              <input
                type="date"
                value={filters.available_date}
                onChange={(e) => handleFilterChange('available_date', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Found <span className="font-semibold text-gray-900">{filteredVenues?.length || 0}</span> venues
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option>Sort by Relevance</option>
            <option>Sort by Price (Low to High)</option>
            <option>Sort by Price (High to Low)</option>
            <option>Sort by Rating</option>
            <option>Sort by Distance</option>
          </select>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Venues Display */}
      {!filteredVenues || filteredVenues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No venues found</h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search criteria or filters to find more venues.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              showActions={false}
              showBookNow={true}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredVenues.map((venue) => (
              <div key={venue.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-10 w-10 text-indigo-600" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{venue.name}</h3>
                        <div className="flex items-center gap-1 text-gray-600 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{venue.location}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-700">{venue.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <button
                          onClick={() => toggleFavorite(venue.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Heart className={`h-5 w-5 ${favorites.includes(venue.id)
                              ? 'text-red-500 fill-current'
                              : 'text-gray-400'
                            }`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {venue.description || 'Professional sports venue available for tournaments and events.'}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-gray-900">${venue.price_per_hour || 0}/hour</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Up to {venue.capacity || 0} people</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>{venue.sport_types?.join(', ') || 'Multi-sport'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {venue.amenities?.slice(0, 4).map((amenity: string) => (
                          <span key={amenity} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {amenity}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/venues/${venue.id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => navigate(`/venues/${venue.id}/book`)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}