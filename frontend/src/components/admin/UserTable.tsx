/**
 * UserTable Component
 * 
 * Displays a table of users with selection, sorting, and action capabilities.
 * 
 * Requirements:
 * - 8.5: Display table with columns (checkbox, name, email, role, date, status, actions)
 * - 8.7: Implement sorting for name, email, registration date, status
 * - 15.1, 15.2: Row selection with checkboxes and "Select All" functionality
 * - 19.2, 19.3, 19.4: Keyboard navigation and accessibility
 */

import React, { useState, useCallback } from 'react';
import type { UserListItem } from '../../types/admin.types';
import { StatusBadge } from './StatusBadge';

interface UserTableProps {
  users: UserListItem[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  onUserClick: (user: UserListItem) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  isLoading?: boolean;
}

type SortField = 'full_name' | 'email' | 'created_at' | 'approval_status';
type SortDirection = 'asc' | 'desc';

/**
 * Role display labels
 */
const ROLE_LABELS: Record<string, string> = {
  PLAYER: 'Player',
  ORGANIZER: 'Organizer',
  REFEREE: 'Referee',
  VENUE_OWNER: 'Venue Owner',
  ADMIN: 'Admin',
};

/**
 * UserTable Component
 * 
 * Renders a sortable, selectable table of users with action buttons.
 * Implements full keyboard navigation and ARIA labels for accessibility.
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUserIds,
  onSelectionChange,
  onUserClick,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
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
   * Sort users based on current sort settings
   */
  const sortedUsers = React.useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date sorting
      if (sortField === 'created_at') {
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
  }, [users, sortField, sortDirection]);

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      // Select all pending users
      const pendingUserIds = users
        .filter(user => user.approval_status === 'PENDING')
        .map(user => user.id);
      onSelectionChange(pendingUserIds);
    } else {
      // Deselect all
      onSelectionChange([]);
    }
  }, [users, onSelectionChange]);

  /**
   * Handle individual user selection
   */
  const handleUserSelect = useCallback((userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUserIds, userId]);
    } else {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    }
  }, [selectedUserIds, onSelectionChange]);

  /**
   * Handle row click (open detail modal)
   */
  const handleRowClick = useCallback((user: UserListItem, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or action buttons
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }
    onUserClick(user);
  }, [onUserClick]);

  /**
   * Handle row keyboard navigation
   */
  const handleRowKeyDown = useCallback((user: UserListItem, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onUserClick(user);
    }
  }, [onUserClick]);

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
  const pendingUsers = users.filter(user => user.approval_status === 'PENDING');
  const allPendingSelected = pendingUsers.length > 0 && 
    pendingUsers.every(user => selectedUserIds.includes(user.id));
  const somePendingSelected = pendingUsers.some(user => selectedUserIds.includes(user.id)) && 
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
                      aria-label="Select all pending users"
                    />
                  </th>

                  {/* Name Column - Sortable */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('full_name')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by name"
                    >
                      <span className="hidden sm:inline">Name</span>
                      <span className="sm:hidden">Name</span>
                      {renderSortIcon('full_name')}
                    </button>
                  </th>

                  {/* Email Column - Sortable */}
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('email')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by email"
                    >
                      Email
                      {renderSortIcon('email')}
                    </button>
                  </th>

                  {/* Role Column - Hidden on mobile */}
                  <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>

                  {/* Registration Date Column - Sortable, Hidden on small mobile */}
                  <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="group inline-flex items-center gap-1 sm:gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      aria-label="Sort by registration date"
                    >
                      <span className="hidden lg:inline">Registration Date</span>
                      <span className="lg:hidden">Reg. Date</span>
                      {renderSortIcon('created_at')}
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
                        <span className="ml-3 text-sm sm:text-base">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm sm:text-base">
                      No users found
                    </td>
                  </tr>
                )}
                {!isLoading && sortedUsers.length > 0 && (
                  <>
                    {sortedUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const isPending = user.approval_status === 'PENDING';

                    return (
                      <tr
                        key={user.id}
                        onClick={(e) => handleRowClick(user, e)}
                        onKeyDown={(e) => handleRowKeyDown(user, e)}
                        tabIndex={0}
                        className="hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        aria-label={`View details for ${user.full_name}`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              aria-label={`Select ${user.full_name}`}
                            />
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                            {user.full_name}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">
                            {user.email}
                          </div>
                        </td>

                        {/* Role - Hidden on mobile */}
                        <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {ROLE_LABELS[user.role] || user.role}
                          </div>
                        </td>

                        {/* Registration Date - Hidden on small mobile */}
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <StatusBadge status={user.approval_status} />
                        </td>

                        {/* Actions */}
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                          {isPending && (
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApprove(user.id);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                aria-label={`Approve ${user.full_name}`}
                              >
                                <span className="hidden sm:inline">Approve</span>
                                <span className="sm:hidden">✓</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReject(user.id);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                aria-label={`Reject ${user.full_name}`}
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
      {!isLoading && sortedUsers.length > 0 && (
        <div className="sm:hidden px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">← Scroll horizontally to see more →</p>
        </div>
      )}
    </div>
  );
};

export default UserTable;
