import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { venueService } from '../services/venueService';
import type { Venue, VenueFilters } from '../types/venue.types';
import { useAuth } from '../hooks/useAuth';

const VenueListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VenueFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Available filter options
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableSports, setAvailableSports] = useState<string[]>([]);

  useEffect(() => {
    loadVenues();
  }, [filters]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await venueService.getVenues(filters);
      setVenues(response.venues);
      
      // Extract unique values for filter options
      const locations = [...new Set(response.venues.map(v => v.location))];
      const sports = [...new Set(response.venues.flatMap(v => v.sport_types))];
      
      setAvailableLocations(locations);
      setAvailableSports(sports);
    } catch (err) {
      setError('Failed to load venues. Please try again.');
      console.error('Error loading venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        setLoading(true);
        const response = await venueService.searchVenues(searchQuery, filters);
        setVenues(response.venues);
      } catch (err) {
        setError('Search failed. Please try again.');
        console.error('Error searching venues:', err);
      } finally {
        setLoading(false);
      }
    } else {
      loadVenues();
    }
  };

  const handleFilterChange = (key: keyof VenueFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const openVenueModal = (venue: Venue) => {
    setSelectedVenue(venue);
    setShowModal(true);
  };

  const closeVenueModal = () => {
    setSelectedVenue(null);
    setShowModal(false);
  };

  const handleBookVenue = async (venueId: string) => {
    // Navigate to booking form or open booking modal
    navigate(`/venues/${venueId}/book`);
  };

  if (loading && venues.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Venues</h1>
        <p className="text-gray-600">Discover and book sports venues for your tournaments and matches</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search venues by name, location, or amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Sport Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sport Type</label>
            <select
              value={filters.sport_type || ''}
              onChange={(e) => handleFilterChange('sport_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sports</option>
              {availableSports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>

          {/* Capacity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Capacity</label>
            <input
              type="number"
              placeholder="Min capacity"
              value={filters.capacity_min || ''}
              onChange={(e) => handleFilterChange('capacity_min', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Price/Hour</label>
            <input
              type="number"
              placeholder="Max price"
              value={filters.price_max || ''}
              onChange={(e) => handleFilterChange('price_max', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          {loading ? 'Loading...' : `Found ${venues.length} venue${venues.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Venue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map(venue => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onViewDetails={() => openVenueModal(venue)}
            onBook={() => handleBookVenue(venue.id)}
            currentUser={user}
          />
        ))}
      </div>

      {/* Empty State */}
      {!loading && venues.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters</p>
        </div>
      )}

      {/* Venue Detail Modal */}
      {showModal && selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          onClose={closeVenueModal}
          onBook={() => handleBookVenue(selectedVenue.id)}
          currentUser={user}
        />
      )}
    </div>
  );
};

// Venue Card Component
interface VenueCardProps {
  venue: Venue;
  onViewDetails: () => void;
  onBook: () => void;
  currentUser: any;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, onViewDetails, onBook, currentUser }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Venue Image */}
      <div className="h-48 bg-gray-200 relative">
        {venue.images && venue.images.length > 0 ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        
        {/* Rating Badge */}
        {venue.rating && (
          <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-sm font-medium">
            ⭐ {venue.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Venue Info */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{venue.name}</h3>
          <span className="text-lg font-bold text-blue-600">${venue.price_per_hour}/hr</span>
        </div>

        <p className="text-gray-600 text-sm mb-2">{venue.location}</p>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{venue.description}</p>

        {/* Venue Details */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>Capacity: {venue.capacity}</span>
          <span>{venue.total_bookings || 0} bookings</span>
        </div>

        {/* Sport Types */}
        <div className="flex flex-wrap gap-1 mb-3">
          {venue.sport_types.slice(0, 3).map(sport => (
            <span key={sport} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {sport}
            </span>
          ))}
          {venue.sport_types.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{venue.sport_types.length - 3} more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Details
          </button>
          {currentUser?.role !== 'VENUE_OWNER' || venue.owner.id !== currentUser.id ? (
            <button
              onClick={onBook}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Now
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/venue-management'}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Venue Detail Modal Component
interface VenueDetailModalProps {
  venue: Venue;
  onClose: () => void;
  onBook: () => void;
  currentUser: any;
}

const VenueDetailModal: React.FC<VenueDetailModalProps> = ({ venue, onClose, onBook, currentUser }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{venue.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Image Gallery */}
          {venue.images && venue.images.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {venue.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${venue.name} - Image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Venue Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Venue Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Location:</span> {venue.location}</p>
                <p><span className="font-medium">Address:</span> {venue.address}</p>
                <p><span className="font-medium">Capacity:</span> {venue.capacity} people</p>
                <p><span className="font-medium">Price:</span> ${venue.price_per_hour}/hour</p>
                {venue.rating && (
                  <p><span className="font-medium">Rating:</span> ⭐ {venue.rating.toFixed(1)}</p>
                )}
                <p><span className="font-medium">Total Bookings:</span> {venue.total_bookings || 0}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Owner Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {venue.owner.name}</p>
                {venue.owner.email && (
                  <p><span className="font-medium">Email:</span> {venue.owner.email}</p>
                )}
                {venue.owner.phone_number && (
                  <p><span className="font-medium">Phone:</span> {venue.owner.phone_number}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {venue.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-700">{venue.description}</p>
            </div>
          )}

          {/* Sport Types */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Supported Sports</h3>
            <div className="flex flex-wrap gap-2">
              {venue.sport_types.map(sport => (
                <span key={sport} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {sport}
                </span>
              ))}
            </div>
          </div>

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {venue.amenities.map(amenity => (
                  <div key={amenity} className="flex items-center text-sm text-gray-700">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {currentUser?.role !== 'VENUE_OWNER' || venue.owner.id !== currentUser.id ? (
              <button
                onClick={onBook}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Book This Venue
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/venue-management'}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Manage This Venue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueListPage;