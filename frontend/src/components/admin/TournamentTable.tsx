/**
 * TournamentTable Component
 * 
 * Displays a table of tournaments with selection, sorting, and action capabilities.
 * 
 * Requirements:
 * - 8.3: Display table with columns (checkbox, tournament_name, sport_type, organizer, submission_date, status, actions)
 * - 8.4: Color-coded status badges (yellow/green/red)
 * - 8.5: Quick action buttons in rows (approve, reject, view details)
 * - 16.2: Row selection for bulk operations
 * - 16.3: Click handler to open TournamentDetailModal
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { TournamentListItem } from '@/types/verification.types';
import { StatusBadge } from './StatusBadge';
import { ActionsDropdown, type DropdownAction } from './ActionsDropdown';

interface TournamentTableProps {
  tournaments: TournamentListItem[];
  selectedTournamentIds: string[];
  onSelectionChange: (tournamentIds: string[]) => void;
  onTournamentClick: (tournament: TournamentListItem) => void;
  onApprove: (tournamentId: string) => void;
  onReject: (tournamentId: string) => void;
  isLoading?: boolean;
}

type SortField = 'title' | 'sport_type' | 'organizer_name' | 'submission_date' | 'approval_status';
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
 * TournamentTable Component
 * 
 * Renders a sortable, selectable table of tournaments with action buttons.
 * Implements full keyboard navigation and ARIA labels for accessibility.
 */
export const TournamentTable: React.FC<TournamentTableProps> = ({
  tournaments,
  selectedTournamentIds,
  onSelectionChange,
  onTournamentClick,
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
   * Sort tournaments based on current sort settings
   */
  const sortedTournaments = useMemo(() => {
    const sorted = [...tournaments].sort((a, b) => {
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
  }, [tournaments, sortField, sortDirection]);

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all pending tournaments
      const pendingTournamentIds = tournaments
        .filter(tournament => tournament.approval_status === 'PENDING')
        .map(tournament => tournament.id);
      onSelectionChange(pendingTournamentIds);
    } else {
      // Deselect all
      onSelectionChange([]);
    }
  }, [tournaments, onSelectionChange]);

  /**
   * Handle individual tournament selection
   */
  const handleTournamentSelect = useCallback((tournamentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTournamentIds, tournamentId]);
    } else {
      onSelectionChange(selectedTournamentIds.filter(id => id !== tournamentId));
    }
  }, [selectedTournamentIds, onSelectionChange]);

  /**
   * Handle row click (open detail modal)
   */
  const handleRowClick = useCallback((tournament: TournamentListItem, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or action buttons
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }
    onTournamentClick(tournament);
  }, [onTournamentClick]);

  /**
   * Handle row keyboard navigation
   */
  const handleRowKeyDown = useCallback((tournament: TournamentListItem, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTournamentClick(tournament);
    }
  }, [onTournamentClick]);

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
  const pendingTournaments = tournaments.filter(tournament => tournament.approval_status === 'PENDING');
  const allPendingSelected = pendingTournaments.length > 0 && 
    pendingTournaments.every(tournament => selectedTournamentIds.includes(tournament.id));
  const somePendingSelected = pendingTournaments.some(tournament => selectedTournamentIds.includes(tournament.id)) && 
    !allPendingSelected;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      ref={input => {
                        if (input) input.indeterminate = somePendingSelected;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      aria-label="Select all pending tournaments"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('title')}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      aria-label="Sort by tournament name"
                    >
                      TOURNAMENT NAME
                      {renderSortIcon('title')}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('sport_type')}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      aria-label="Sort by sport type"
                    >
                      SPORT
                      {renderSortIcon('sport_type')}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('organizer_name')}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      aria-label="Sort by organizer"
                    >
                      ORGANIZER
                      {renderSortIcon('organizer_name')}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('submission_date')}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      aria-label="Sort by submission date"
                    >
                      REG. DATE
                      {renderSortIcon('submission_date')}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('approval_status')}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                      aria-label="Sort by status"
                    >
                      STATUS
                      {renderSortIcon('approval_status')}
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="ml-3">Loading tournaments...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && sortedTournaments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No tournaments found
                    </td>
                  </tr>
                )}
                {!isLoading && sortedTournaments.length > 0 && sortedTournaments.map((tournament) => {
                  const isSelected = selectedTournamentIds.includes(tournament.id);
                  const isPending = tournament.approval_status === 'PENDING';
                  return (
                    <tr
                      key={tournament.id}
                      onClick={(e) => handleRowClick(tournament, e)}
                      onKeyDown={(e) => handleRowKeyDown(tournament, e)}
                      tabIndex={0}
                      className="hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
                      aria-label={`View details for ${tournament.title}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleTournamentSelect(tournament.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            aria-label={`Select ${tournament.title}`}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tournament.title}</div>
                        <div className="text-sm text-gray-600">{tournament.venue}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {SPORT_TYPE_LABELS[tournament.sport_type] || tournament.sport_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{tournament.organizer_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(tournament.submission_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={tournament.approval_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isPending && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprove(tournament.id);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              aria-label={`Approve ${tournament.title}`}
                              title="Approve"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(tournament.id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Reject ${tournament.title}`}
                              title="Reject"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {!isPending && (
                          <ActionsDropdown
                            label={`Actions for ${tournament.title}`}
                            actions={[
                              {
                                label: 'View Details',
                                icon: (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ),
                                onClick: () => onTournamentClick(tournament),
                              },
                              {
                                label: 'Download Report',
                                icon: (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ),
                                onClick: () => {
                                  // TODO: Implement download report
                                  console.log('Download report for:', tournament.id);
                                },
                                disabled: tournament.approval_status !== 'APPROVED',
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {!isLoading && sortedTournaments.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            SHOWING 1 TO {sortedTournaments.length} OF {sortedTournaments.length} ENTRIES
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentTable;
