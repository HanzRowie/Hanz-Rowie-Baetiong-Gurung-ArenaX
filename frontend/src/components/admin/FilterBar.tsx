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
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
      {/* Search Input - Always Visible */}
      <div className="mb-4">
        <label 
          htmlFor="search-filter" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Search by Name or Email
        </label>
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
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            aria-label="Search users by name or email"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Toggle Button (Mobile) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-4"
        aria-expanded={isExpanded}
        aria-controls="advanced-filters"
      >
        <span className="text-sm font-medium text-gray-700">
          Advanced Filters {hasActiveFilters && `(${Object.keys(filters).filter(k => k !== 'page' && k !== 'page_size' && k !== 'search' && filters[k as keyof UserFilters]).length})`}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {/* Advanced Filters - Collapsible on Mobile, Always Visible on Desktop */}
      <div 
        id="advanced-filters"
        className={`${isExpanded ? 'block' : 'hidden'} lg:block`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Role Filter */}
          <div className="flex-1 min-w-0">
            <label 
              htmlFor="role-filter" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Role
            </label>
            <select
              id="role-filter"
              value={filters.role || ''}
              onChange={handleRoleChange}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
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
          <div className="flex-1 min-w-0">
            <label 
              htmlFor="status-filter" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status || ''}
              onChange={handleStatusChange}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              aria-label="Filter by approval status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker - From */}
          <div className="flex-1 min-w-0">
            <label 
              htmlFor="date-from-filter" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              From Date
            </label>
            <input
              type="date"
              id="date-from-filter"
              value={filters.registration_date_from || ''}
              onChange={handleDateFromChange}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              aria-label="Filter by registration date from"
            />
          </div>

          {/* Date Range Picker - To */}
          <div className="flex-1 min-w-0">
            <label 
              htmlFor="date-to-filter" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              To Date
            </label>
            <input
              type="date"
              id="date-to-filter"
              value={filters.registration_date_to || ''}
              onChange={handleDateToChange}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              aria-label="Filter by registration date to"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 sm:px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs sm:text-sm text-gray-600">Active filters:</span>
          {filters.role && (
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
              Role: {ROLE_OPTIONS.find(o => o.value === filters.role)?.label}
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-purple-100 text-purple-800">
              Status: {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
            </span>
          )}
          {filters.registration_date_from && (
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-green-100 text-green-800">
              From: {filters.registration_date_from}
            </span>
          )}
          {filters.registration_date_to && (
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-green-100 text-green-800">
              To: {filters.registration_date_to}
            </span>
          )}
          {filters.search && (
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-yellow-100 text-yellow-800 break-all">
              Search: "{filters.search}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
