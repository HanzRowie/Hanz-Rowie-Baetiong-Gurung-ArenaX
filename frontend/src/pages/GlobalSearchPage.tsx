import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BookmarkIcon,
  ClockIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { searchService } from '@/services/searchService';
import SearchPreferences from '@/components/SearchPreferences';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSearchPreferences } from '@/hooks/useSearchPreferences';
import type {
  GlobalSearchResult,
  SearchFilters,
  FilterOptions,
  AutocompleteResult,
  SearchPreference
} from '@/types/search.types';
import type { Tournament } from '@/types/tournament.types';
import type { ExtendedUserProfile } from '@/types/user.types';
import type { Venue } from '@/types/venue.types';

interface SearchResultCardProps {
  item: Tournament | ExtendedUserProfile | Venue;
  type: 'tournament' | 'player' | 'venue';
  onResultClick: (type: string, id: string, title: string) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ item, type, onResultClick }) => {
  const handleClick = () => {
    let title = '';
    if (type === 'tournament') {
      title = (item as Tournament).title;
    } else if (type === 'player') {
      title = (item as ExtendedUserProfile).full_name;
    } else if (type === 'venue') {
      title = (item as Venue).name;
    }
    onResultClick(type, item.id, title);
  };

  if (type === 'tournament') {
    const tournament = item as Tournament;
    return (
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{tournament.title}</h3>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{tournament.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {tournament.sport_type}
              </span>
              <span>{new Date(tournament.date).toLocaleDateString()}</span>
              <span>{tournament.registered_count}/{tournament.max_participants} players</span>
            </div>
          </div>
          {tournament.tournament_image && (
            <img 
              src={tournament.tournament_image} 
              alt={tournament.title}
              className="w-16 h-16 rounded-lg object-cover ml-4"
            />
          )}
        </div>
      </div>
    );
  }

  if (type === 'player') {
    const player = item as ExtendedUserProfile;
    return (
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center space-x-4">
          {player.profile_picture ? (
            <img 
              src={player.profile_picture} 
              alt={player.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {player.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{player.full_name}</h3>
            <p className="text-sm text-gray-600 mb-1">{player.location}</p>
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {player.skill_level}
              </span>
              {player.preferred_sports.slice(0, 2).map((sport, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {sport}
                </span>
              ))}
              {player.match_score && (
                <span className="text-blue-600 font-medium">
                  {Math.round(player.match_score)}% match
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'venue') {
    const venue = item as Venue;
    return (
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{venue.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{venue.location}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Capacity: {venue.capacity}</span>
              <span>NPR {venue.price_per_hour}/hour</span>
              <span>{venue.amenities.length} amenities</span>
            </div>
          </div>
          {venue.images && venue.images.length > 0 && (
            <img 
              src={venue.images[0]} 
              alt={venue.name}
              className="w-16 h-16 rounded-lg object-cover ml-4"
            />
          )}
        </div>
      </div>
    );
  }

  return null;
};

const GlobalSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category: (searchParams.get('category') as any) || 'all',
    location: searchParams.get('location') || '',
    sport_type: searchParams.get('sport') || '',
    sort_by: (searchParams.get('sort') as any) || 'relevance',
    page: parseInt(searchParams.get('page') || '1'),
    per_page: 20
  });
  
  // UI state
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  
  // Autocomplete and preferences
  const [suggestions, setSuggestions] = useState<AutocompleteResult | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  // Use custom hooks for search history and preferences
  const { history, addToHistory, recordClick } = useSearchHistory(20);
  const { 
    preferences, 
    defaultPreference
  } = useSearchPreferences();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchFilters: SearchFilters) => {
      if (!searchFilters.query && searchFilters.category === 'all') {
        setResults(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const searchResults = await searchService.searchWithCache(searchFilters);
        setResults(searchResults);
        
        // Record search in history
        if (searchFilters.query) {
          await addToHistory(
            searchFilters.query,
            searchFilters,
            searchResults.total_results
          );
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to perform search. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Debounced autocomplete function
  const debouncedAutocomplete = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions(null);
        return;
      }

      try {
        const autocompleteSuggestions = await searchService.getAutocompleteSuggestions(
          searchQuery,
          filters.category !== 'all' ? filters.category : undefined
        );
        setSuggestions(autocompleteSuggestions);
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 200),
    [filters.category]
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const filterOpts = await searchService.getFilterOptions();
        setFilterOptions(filterOpts);
        
        // Apply default preference if available and no search params
        if (defaultPreference && !searchParams.get('q')) {
          setFilters(prev => ({ ...prev, ...defaultPreference.filters }));
          setQuery(defaultPreference.filters.query || '');
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };

    loadInitialData();
  }, [defaultPreference, searchParams]);

  // Perform search when filters change
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, debouncedSearch]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.location) params.set('location', filters.location);
    if (filters.sport_type) params.set('sport', filters.sport_type);
    if (filters.sort_by && filters.sort_by !== 'relevance') params.set('sort', filters.sort_by);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Handle query input change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setFilters(prev => ({ ...prev, query: value, page: 1 }));
    
    // Show suggestions for non-empty queries
    if (value.length > 0) {
      setShowSuggestions(true);
      debouncedAutocomplete(value);
    } else {
      setShowSuggestions(false);
      setSuggestions(null);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    setShowSuggestions(false);
  };

  // Handle result click
  const handleResultClick = async (type: string, id: string, title: string) => {
    // Record click for analytics
    try {
      // Find the most recent search history entry to record the click
      if (history.length > 0) {
        await recordClick(history[0].id, type, id, title);
      }
    } catch (err) {
      console.error('Failed to record search click:', err);
    }

    // Navigate to the appropriate page
    if (type === 'tournament') {
      navigate(`/tournaments/${id}`);
    } else if (type === 'player') {
      navigate(`/profile/${id}`);
    } else if (type === 'venue') {
      navigate(`/venues/${id}`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setFilters(prev => ({ ...prev, query: suggestion, page: 1 }));
    setShowSuggestions(false);
  };

  // Handle preference selection
  const handlePreferenceSelect = (preference: SearchPreference) => {
    setFilters(prev => ({ ...prev, ...preference.filters, page: 1 }));
    setQuery(preference.filters.query || '');
    setShowPreferences(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      category: 'all',
      sort_by: 'relevance',
      page: 1,
      per_page: 20
    };
    setFilters(clearedFilters);
    setQuery('');
    setShowPreferences(false);
  };

  // Calculate total results for display
  const totalResults = results ? results.total_results : 0;
  const searchTime = results ? results.search_time : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="relative">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => query.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search tournaments, players, venues..."
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              {query && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                {suggestions.suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Suggestions
                    </div>
                    {suggestions.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                        <span>{suggestion.text}</span>
                        {suggestion.type !== 'query' && (
                          <span className="text-xs text-gray-500 capitalize">
                            {suggestion.type}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {suggestions.recent_searches.length > 0 && (
                  <div className="border-t border-gray-100 p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Recent Searches
                    </div>
                    {suggestions.recent_searches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>{search}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show recent searches from history if no suggestions */}
                {(!suggestions.recent_searches || suggestions.recent_searches.length === 0) && history.length > 0 && (
                  <div className="border-t border-gray-100 p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Recent Searches
                    </div>
                    {history.slice(0, 5).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(item.query)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>{item.query}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {item.results_count} results
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="tournaments">Tournaments</option>
                <option value="players">Players</option>
                <option value="venues">Venues</option>
              </select>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
                {Object.keys(filters).filter(key => 
                  key !== 'query' && key !== 'category' && key !== 'sort_by' && key !== 'page' && key !== 'per_page' && 
                  filters[key as keyof SearchFilters]
                ).length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                    {Object.keys(filters).filter(key => 
                      key !== 'query' && key !== 'category' && key !== 'sort_by' && key !== 'page' && key !== 'per_page' && 
                      filters[key as keyof SearchFilters]
                    ).length}
                  </span>
                )}
              </button>

              {/* Saved Preferences */}
              <div className="relative">
                <button
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  <span>Preferences</span>
                  {preferences.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                      {preferences.length}
                    </span>
                  )}
                </button>

                {/* Search Preferences Dropdown */}
                {showPreferences && (
                  <div className="absolute top-full left-0 mt-1 z-20">
                    <SearchPreferences
                      currentFilters={filters}
                      onPreferenceSelect={handlePreferenceSelect}
                      onClose={() => setShowPreferences(false)}
                    />
                  </div>
                )}
              </div>

              {/* Clear Filters */}
              {(query || filters.category !== 'all' || Object.keys(filters).some(key => 
                key !== 'query' && key !== 'category' && key !== 'sort_by' && key !== 'page' && key !== 'per_page' && 
                filters[key as keyof SearchFilters]
              )) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={filters.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="rating">Rating</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && filterOptions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Location</option>
                  {filterOptions.locations.map(location => (
                    <option key={location.value} value={location.value}>
                      {location.label} ({location.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sport Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sport
                </label>
                <select
                  value={filters.sport_type || ''}
                  onChange={(e) => handleFilterChange('sport_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Sport</option>
                  {filterOptions.sports.map(sport => (
                    <option key={sport.value} value={sport.value}>
                      {sport.label} ({sport.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.price_min || ''}
                  onChange={(e) => handleFilterChange('price_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="NPR 0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.price_max || ''}
                  onChange={(e) => handleFilterChange('price_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Any"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Skill Level Filter (for players) */}
              {filters.category === 'players' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Level
                  </label>
                  <select
                    value={filters.skill_level || ''}
                    onChange={(e) => handleFilterChange('skill_level', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any Level</option>
                    {filterOptions.skill_levels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} ({level.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Availability Filter */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.availability || false}
                    onChange={(e) => handleFilterChange('availability', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Available only</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-6">
          {/* Results Summary */}
          {(results || loading) && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {loading ? (
                  'Searching...'
                ) : results ? (
                  `${totalResults.toLocaleString()} results found in ${searchTime.toFixed(2)}s`
                ) : null}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Search Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex space-x-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results by Category */}
          {results && !loading && (
            <div className="space-y-8">
              {/* Tournament Results */}
              {results.tournaments.items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Tournaments ({results.tournaments.total})
                    </h2>
                    {filters.category === 'all' && results.tournaments.total > results.tournaments.items.length && (
                      <button
                        onClick={() => handleFilterChange('category', 'tournaments')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all tournaments →
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {results.tournaments.items.map(tournament => (
                      <SearchResultCard
                        key={tournament.id}
                        item={tournament}
                        type="tournament"
                        onResultClick={handleResultClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Player Results */}
              {results.players.items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Players ({results.players.total})
                    </h2>
                    {filters.category === 'all' && results.players.total > results.players.items.length && (
                      <button
                        onClick={() => handleFilterChange('category', 'players')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all players →
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {results.players.items.map(player => (
                      <SearchResultCard
                        key={player.id}
                        item={player}
                        type="player"
                        onResultClick={handleResultClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Venue Results */}
              {results.venues.items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Venues ({results.venues.total})
                    </h2>
                    {filters.category === 'all' && results.venues.total > results.venues.items.length && (
                      <button
                        onClick={() => handleFilterChange('category', 'venues')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all venues →
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {results.venues.items.map(venue => (
                      <SearchResultCard
                        key={venue.id}
                        item={venue}
                        type="venue"
                        onResultClick={handleResultClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {totalResults === 0 && (
                <div className="text-center py-12">
                  <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search terms or filters.
                  </p>
                  {results.suggestions && results.suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {results.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleQueryChange(suggestion)}
                            className="text-blue-600 hover:text-blue-700 text-sm underline"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {results && totalResults > (filters.per_page || 20) && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                      disabled={!results.tournaments.has_prev && !results.players.has_prev && !results.venues.has_prev}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                      disabled={!results.tournaments.has_next && !results.players.has_next && !results.venues.has_next}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{filters.page || 1}</span> of{' '}
                        <span className="font-medium">
                          {Math.ceil(totalResults / (filters.per_page || 20))}
                        </span>
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                          disabled={!results.tournaments.has_prev && !results.players.has_prev && !results.venues.has_prev}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                          disabled={!results.tournaments.has_next && !results.players.has_next && !results.venues.has_next}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchPage;