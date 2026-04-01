import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  Calendar,
  Trophy,
  Users,
  X,
  Filter,
  Star,
  Zap,
  Award,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Card } from '@/design-system/components/Card';

export interface TournamentFilterOptions {
  search: string;
  sportType: string;
  skillLevel: string;
  location: string;
  maxEntryFee: string;
  dateFrom: string;
  dateTo: string;
  tournamentType: string;
  status: string;
  prizePoolMin: string;
  maxParticipants: string;
  featured: boolean;
  popular: boolean;
  freeOnly: boolean;
}

interface TournamentFiltersProps {
  filters: TournamentFilterOptions;
  onFiltersChange: (filters: TournamentFilterOptions) => void;
  onClearFilters: () => void;
  totalResults: number;
  loading?: boolean;
}

const SPORT_TYPES = [
  'Futsal', 'Badminton'
];

const SKILL_LEVELS = [
  'Beginner', 'Intermediate', 'Advanced', 'Professional', 'Open'
];

const TOURNAMENT_TYPES = [
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' }
];

const STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' }
];

const LOCATIONS = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan',
  'Butwal', 'Biratnagar', 'Dharan', 'Janakpur', 'Nepalgunj'
];

export default function TournamentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
  loading = false
}: TournamentFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  const updateFilter = (key: keyof TournamentFilterOptions, value: string | boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.sportType) count++;
    if (filters.skillLevel) count++;
    if (filters.location) count++;
    if (filters.maxEntryFee) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.tournamentType) count++;
    if (filters.status) count++;
    if (filters.prizePoolMin) count++;
    if (filters.maxParticipants) count++;
    if (filters.featured) count++;
    if (filters.popular) count++;
    if (filters.freeOnly) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="p-6 space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tournaments by name, sport, organizer, or location..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-12 pr-4 py-4 text-lg"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Filters Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowQuickFilters(!showQuickFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-emerald-600"
          >
            <Filter className="h-4 w-4" />
            Quick Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showQuickFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {totalResults > 0 && (
            <span className="text-sm text-gray-500">
              {loading ? 'Searching...' : `${totalResults} tournaments found`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
              {activeFilterCount} active
            </span>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Advanced
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600 hover:text-red-600"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      {showQuickFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sport Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
            <select
              value={filters.sportType}
              onChange={(e) => updateFilter('sportType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Sports</option>
              {SPORT_TYPES.map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>

          {/* Location */}
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

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Max Entry Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Entry Fee</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-400">₨</span>
              <input
                type="number"
                placeholder="0"
                value={filters.maxEntryFee}
                onChange={(e) => updateFilter('maxEntryFee', e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Special Filter Toggles */}
      {showQuickFilters && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => updateFilter('featured', !filters.featured)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.featured
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star className="h-4 w-4" />
            Featured Only
          </button>

          <button
            onClick={() => updateFilter('popular', !filters.popular)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.popular
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            Popular
          </button>

          <button
            onClick={() => updateFilter('freeOnly', !filters.freeOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.freeOnly
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Free Entry
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="pt-6 border-t border-gray-200 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Skill Level */}
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

            {/* Tournament Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Type</label>
              <select
                value={filters.tournamentType}
                onChange={(e) => updateFilter('tournamentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">All Types</option>
                {TOURNAMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Min Prize Pool */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Prize Pool</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="0"
                  value={filters.prizePoolMin}
                  onChange={(e) => updateFilter('prizePoolMin', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="Any"
                  value={filters.maxParticipants}
                  onChange={(e) => updateFilter('maxParticipants', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}