/**
 * FilterBar Component
 * 
 * Provides filtering controls for the admin user management interface.
 * Includes role filter, status filter, date range picker, and search input.
 * 
 * Requirements:
 * - 8.4: Display filter bar with role, status, date range, and search controls
 * - 8.9: Mobile responsive with collapsible filters
 * - 18.6: Implement search debouncing (300ms)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { UserFilters, UserRole, ApprovalStatus } from '../../types/admin.types';

interface FilterBarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
}

/**
 * Role filter options with display labels
 */
const ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'All Roles' },
  { value: 'PLAYER', label: 'Player' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'REFEREE', label: 'Referee' },
  { value: 'VENUE_OWNER', label: 'Venue Owner' },
  { value: 'ADMIN', label: 'Admin' },
];

/**
 * Status filter options with display labels
 */
const STATUS_OPTIONS: { value: ApprovalStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/**
 * FilterBar Component
 * 
 * Provides comprehensive filtering controls for user management.
 * Implements debounced search to prevent excessive API requests.
 * Mobile responsive with collapsible advanced filters.
 */
export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFiltersChange }) => {
  // Local state for search input (for debouncing)
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search effect (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({
          ...filters,
          search: searchInput || undefined,
          page: 1, // Reset to first page on search
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]); // Only depend on searchInput to avoid infinite loops

  /**
   * Handle role filter change
   */
  const handleRoleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as UserRole | '';
    onFiltersChange({
      ...filters,
      role: value || undefined,
      page: 1, // Reset to first page
    });
  }, [filters, onFiltersChange]);

  /**
   * Handle status filter change
   */
  const handleStatusChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ApprovalStatus | '';
    onFiltersChange({
      ...filters,
      status: value || undefined,
      page: 1, // Reset to first page
    });
  }, [filters, onFiltersChange]);

  /**
   * Handle date from change
   */
  const handleDateFromChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      registration_date_from: value || undefined,
      page: 1, // Reset to first page
    });
  }, [filters, onFiltersChange]);

  /**
   * Handle date to change
   */
  const handleDateToChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      registration_date_to: value || undefined,
      page: 1, // Reset to first page
    });
  }, [filters, onFiltersChange]);

  /**
   * Handle search input change (local state only, debounced)
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({
      page: 1,
      page_size: filters.page_size,
    });
  }, [filters.page_size, onFiltersChange]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = 
    filters.role || 
    filters.status || 
    filters.registration_date_from || 
    filters.registration_date_to || 
    filters.search;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
      {/* Main Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search Input - Takes more space */}
        <div className="md:col-span-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
            <input
              type="text"
              id="search-filter"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              aria-label="Search users by name or email"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="md:col-span-2">
          <select
            id="role-filter"
            value={filters.role || ''}
            onChange={handleRoleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            aria-label="Filter by user role"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2">
          <select
            id="status-filter"
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            aria-label="Filter by approval status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="md:col-span-3">
          <input
            type="date"
            id="date-from-filter"
            value={filters.registration_date_from || ''}
            onChange={handleDateFromChange}
            placeholder="dd / mm / yyyy"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            aria-label="Filter by registration date"
          />
        </div>

        {/* Apply Filters Button */}
        <div className="md:col-span-1">
          <button
            type="button"
            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            aria-label="Apply filters"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
