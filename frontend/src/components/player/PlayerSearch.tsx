import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  Trophy,
  Users,
  Filter,
  X,
  ChevronDown,
  Target,
  Calendar,
  Clock,
  Zap,
  Heart,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';

export interface PlayerSearchFilters {
  query: string;
  location: string;
  skillLevel: string;
  minSkillRating: string;
  maxSkillRating: string;
  preferredSports: string[];
  minWinRate: string;
  maxDistance: string;
  availability: {
    weekdays: boolean;
    weekends: boolean;
    mornings: boolean;
    evenings: boolean;
  };
  isOnline: boolean;
  hasRecentActivity: boolean;
  minCompatibility: string;
  connectionStatus: string;
  ageRange: {
    min: string;
    max: string;
  };
  playStyle: string;
  tournamentExperience: string;
}

interface PlayerSearchProps {
  filters: PlayerSearchFilters;
  onFiltersChange: (filters: PlayerSearchFilters) => void;
  onSearch: (filters: PlayerSearchFilters) => void;
  onClearFilters: () => void;
  totalResults: number;
  loading?: boolean;
  suggestedFilters?: Array<{
    label: string;
    filters: Partial<PlayerSearchFilters>;
  }>;
}

const SKILL_LEVELS = [
  'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'
];

const SPORTS = [
  'Futsal', 'Badminton'
];

const LOCATIONS = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan',
  'Butwal', 'Biratnagar', 'Dharan', 'Janakpur', 'Nepalgunj'
];

const PLAY_STYLES = [
  'Aggressive', 'Defensive', 'Balanced', 'Strategic', 'Casual', 'Competitive'
];

const CONNECTION_STATUS_OPTIONS = [
  { value: '', label: 'All Players' },
  { value: 'none', label: 'Not Connected' },
  { value: 'connected', label: 'Connected' },
  { value: 'mutual_friends', label: 'Mutual Friends' },
];

const TOURNAMENT_EXPERIENCE = [
  { value: '', label: 'Any Experience' },
  { value: 'beginner', label: 'New to Tournaments (0-5)' },
  { value: 'experienced', label: 'Experienced (6-20)' },
  { value: 'veteran', label: 'Veteran (20+)' },
];

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default function PlayerSearch({
  filters,
  onFiltersChange,
  onSearch,
  onClearFilters,
  totalResults,
  loading = false,
  suggestedFilters = []
}: PlayerSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchFilters: PlayerSearchFilters) => {
      onSearch(searchFilters);
    }, 300),
    [onSearch]
  );

  useEffect(() => {
    if (filters.query || getActiveFilterCount() > 0) {
      debouncedSearch(filters);
    }
  }, [filters, debouncedSearch]);

  const updateFilter = <K extends keyof PlayerSearchFilters>(
    key: K,
    value: PlayerSearchFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const updateAvailability = (key: keyof PlayerSearchFilters['availability'], value: boolean) => {
    const newAvailability = { ...filters.availability, [key]: value };
    updateFilter('availability', newAvailability);
  };

  const updateAgeRange = (key: keyof PlayerSearchFilters['ageRange'], value: string) => {
    const newAgeRange = { ...filters.ageRange, [key]: value };
    updateFilter('ageRange', newAgeRange);
  };

  const toggleSport = (sport: string) => {
    const newSports = filters.preferredSports.includes(sport)
      ? filters.preferredSports.filter(s => s !== sport)
      : [...filters.preferredSports, sport];
    updateFilter('preferredSports', newSports);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.location) count++;
    if (filters.skillLevel) count++;
    if (filters.minSkillRating) count++;
    if (filters.maxSkillRating) count++;
    if (filters.preferredSports.length > 0) count++;
    if (filters.minWinRate) count++;
    if (filters.maxDistance) count++;
    if (Object.values(filters.availability).some(Boolean)) count++;
    if (filters.isOnline) count++;
    if (filters.hasRecentActivity) count++;
    if (filters.minCompatibility) count++;
    if (filters.connectionStatus) count++;
    if (filters.ageRange.min || filters.ageRange.max) count++;
    if (filters.playStyle) count++;
    if (filters.tournamentExperience) count++;
    return count;
  };

  const applySuggestedFilter = (suggestedFilter: Partial<PlayerSearchFilters>) => {
    const newFilters = { ...filters, ...suggestedFilter };
    onFiltersChange(newFilters);
    setShowSuggestions(false);
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search players by name, location, or interests..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-10 pr-4 py-3"
            />
            {filters.query && (
              <button
                onClick={() => updateFilter('query', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {loading ? 'Searching...' : `${totalResults} players found`}
            </span>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear all filters
              </Button>
            )}
          </div>

          {/* Suggested Filters */}
          {suggestedFilters.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Quick Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
              </Button>

              {showSuggestions && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    {suggestedFilters.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => applySuggestedFilter(suggestion.filters)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </h3>

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">All Locations</option>
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                <select
                  value={filters.skillLevel}
                  onChange={(e) => updateFilter('skillLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">All Levels</option>
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Play Style</label>
                <select
                  value={filters.playStyle}
                  onChange={(e) => updateFilter('playStyle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Any Style</option>
                  {PLAY_STYLES.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Connection Status</label>
                <select
                  value={filters.connectionStatus}
                  onChange={(e) => updateFilter('connectionStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  {CONNECTION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Skill Rating Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skill Rating Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Min rating"
                    value={filters.minSkillRating}
                    onChange={(e) => updateFilter('minSkillRating', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Max rating"
                    value={filters.maxSkillRating}
                    onChange={(e) => updateFilter('maxSkillRating', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Min age"
                  value={filters.ageRange.min}
                  onChange={(e) => updateAgeRange('min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  placeholder="Max age"
                  value={filters.ageRange.max}
                  onChange={(e) => updateAgeRange('max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Win Rate (%)</label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={filters.minWinRate}
                    onChange={(e) => updateFilter('minWinRate', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Distance (km)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Any distance"
                    value={filters.maxDistance}
                    onChange={(e) => updateFilter('maxDistance', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tournament Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Experience</label>
              <select
                value={filters.tournamentExperience}
                onChange={(e) => updateFilter('tournamentExperience', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                {TOURNAMENT_EXPERIENCE.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Preferred Sports */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Sports</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => toggleSport(sport)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${filters.preferredSports.includes(sport)
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries({
                  weekdays: 'Weekdays',
                  weekends: 'Weekends',
                  mornings: 'Mornings',
                  evenings: 'Evenings'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.availability[key as keyof typeof filters.availability]}
                      onChange={(e) => updateAvailability(key as keyof typeof filters.availability, e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isOnline}
                  onChange={(e) => updateFilter('isOnline', e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Online now</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasRecentActivity}
                  onChange={(e) => updateFilter('hasRecentActivity', e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Active recently</span>
              </label>
            </div>

            {/* Min Compatibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Compatibility Score (%)
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  max="100"
                  value={filters.minCompatibility}
                  onChange={(e) => updateFilter('minCompatibility', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}