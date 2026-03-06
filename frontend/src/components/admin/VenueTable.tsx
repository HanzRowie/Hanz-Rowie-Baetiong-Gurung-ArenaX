/**
 * VenueTable Component
 * 
 * Displays a table of venues with selection, sorting, and action capabilities.
 * 
 * Requirements:
 * - 9.3: Display table with columns (checkbox, venue_name, sport_type, owner, submission_date, status, actions)
 * - 9.4: Color-coded status badges (yellow/green/red)
 * - 9.5: Quick action buttons in rows (approve, reject, view details)
 * - 16.2: Row selection for bulk operations
 * - 16.3: Click handler to open VenueDetailModal
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { VenueListItem } from '@/types/verification.types';
import { StatusBadge } from './StatusBadge';

interface VenueTableProps {
  venues: VenueListItem[];
  selectedVenueIds: string[];
  onSelectionChange: (venueIds: string[]) => void;
  onVenueClick: (venue: VenueListItem) => void;
  onApprove: (venueId: string) => void;
  onReject: (venueId: string) => void;
  isLoading?: boolean;
}

type SortField = 'name' | 'sport_type' | 'owner_name' | 'submission_date' | 'approval_status';
type SortDirection = 'asc' | 'desc';

/**
 * Sport type display labels
 */
const SPORT_TYPE_LABELS: Record<string, string> = {
  FUTSAL: 'Futsal',
  BASKETBALL: 'Basketball',
  BADMINTON: 'Badminton',
  VOLLEYBALL: 'Volleyball',
};

/**
 * VenueTable Component
 * 
 * Renders a sortable, selectable table of venues with action buttons.
 * Implements full keyboard navigation and ARIA labels for accessibility.
 */
export const VenueTable: React.FC<VenueTableProps> = ({
  venues,
  selectedVenueIds,
  onSelectionChange,
  onVenueClick,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('submission_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Handle sort column click
   */
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default ascending
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  /**
   * Sort venues based on current sort settings
   */
  const sortedVenues = useMemo(() => {
    const sorted = [...venues].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date sorting
      if (sortField === 'submission_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string sorting (case-insensitive)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [venues, sortField, sortDirection]);

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all pending venues
      const pendingVenueIds = venues
        .filter(venue => venue.approval_status === 'PENDING')
        .map(venue => venue.id);
      onSelectionChange(pendingVenueIds);
    } else {
      // Deselect all
      onSelectionChange([]);
    }
  }, [venues, onSelectionChange]);

  /**
   * Handle individual venue selection
   */
  const handleVenueSelect = useCallback((venueId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedVenueIds, venueId]);
    } else {
      onSelectionChange(selectedVenueIds.filter(id => id !== venueId));
    }
  }, [selectedVenueIds, onSelectionChange]);

  /**
   * Handle row click (open detail modal)
   */
  const handleRowClick = useCallback((venue: VenueListItem, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or action buttons
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }
    onVenueClick(venue);
  }, [onVenueClick]);

  /**
   * Handle row keyboard navigation
   */
  const handleRowKeyDown = useCallback((venue: VenueListItem, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onVenueClick(venue);
    }
  }, [onVenueClick]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Render sort indicator icon
   */
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Calculate selection state
  const pendingVenues = venues.filter(venue => venue.approval_status === 'PENDING');
  const allPendingSelected = pendingVenues.length > 0 && 
    pendingVenues.every(venue => selectedVenueIds.includes(venue.id));
  const somePendingSelected = pendingVenues.some(venue => selectedVenueIds.includes(venue.id)) && 
    !allPendingSelected;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Mobile: Horizontal scroll wrapper */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Select All Checkbox */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      ref={input => {
                        if (input) input.indeterminate = somePendingSelected;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label="Select all pending venues"
                    />
                  </th>

                  {/* Venue Name Column - Sortable */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by venue name"
                    >
                      <span className="hidden sm:inline">Venue Name</span>
                      <span className="sm:hidden">Name</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>

                  {/* Sport Type Column - Sortable */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('sport_type')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by sport type"
                    >
                      Sport
                      {renderSortIcon('sport_type')}
                    </button>
                  </th>

                  {/* Owner Column - Sortable, Hidden on mobile */}
                  <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('owner_name')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by owner"
                    >
                      Owner
                      {renderSortIcon('owner_name')}
                    </button>
                  </th>

                  {/* Submission Date Column - Sortable, Hidden on small mobile */}
                  <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('submission_date')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by submission date"
                    >
                      <span className="hidden lg:inline">Submission Date</span>
                      <span className="lg:hidden">Submitted</span>
                      {renderSortIcon('submission_date')}
                    </button>
                  </th>

                  {/* Status Column - Sortable */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('approval_status')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by status"
                    >
                      Status
                      {renderSortIcon('approval_status')}
                    </button>
                  </th>

                  {/* Actions Column */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="ml-3 text-sm sm:text-base">Loading venues...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && sortedVenues.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm sm:text-base">
                      No venues found
                    </td>
                  </tr>
                )}
                {!isLoading && sortedVenues.length > 0 && (
                  <>
                    {sortedVenues.map((venue) => {
                    const isSelected = selectedVenueIds.includes(venue.id);
                    const isPending = venue.approval_status === 'PENDING';

                    return (
                      <tr
                        key={venue.id}
                        onClick={(e) => handleRowClick(venue, e)}
                        onKeyDown={(e) => handleRowKeyDown(venue, e)}
                        tabIndex={0}
                        className="hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        aria-label={`View details for ${venue.name}`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleVenueSelect(venue.id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              aria-label={`Select ${venue.name}`}
                            />
                          )}
                        </td>

                        {/* Venue Name */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">
                            {venue.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-none">
                            {venue.address}
                          </div>
                        </td>

                        {/* Sport Type */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {SPORT_TYPE_LABELS[venue.sport_type] || venue.sport_type}
                          </div>
                        </td>

                        {/* Owner - Hidden on mobile */}
                        <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px]">
                            {venue.owner_name}
                          </div>
                        </td>

                        {/* Submission Date - Hidden on small mobile */}
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {formatDate(venue.submission_date)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <StatusBadge status={venue.approval_status} />
                        </td>

                        {/* Actions */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                          {isPending && (
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApprove(venue.id);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                aria-label={`Approve ${venue.name}`}
                              >
                                <span className="hidden sm:inline">Approve</span>
                                <span className="sm:hidden">✓</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReject(venue.id);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                aria-label={`Reject ${venue.name}`}
                              >
                                <span className="hidden sm:inline">Reject</span>
                                <span className="sm:hidden">✕</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Mobile scroll hint */}
      {!isLoading && sortedVenues.length > 0 && (
        <div className="sm:hidden px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">← Scroll horizontally to see more →</p>
        </div>
      )}
    </div>
  );
};

export default VenueTable;
