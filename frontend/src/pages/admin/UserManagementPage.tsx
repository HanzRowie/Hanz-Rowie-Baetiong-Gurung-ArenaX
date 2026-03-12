/**
 * UserManagementPage - Complete admin page for managing user approvals
 * 
 * Integrates all admin components with React Query and WebSocket real-time updates.
 * 
 * Requirements:
 * - 8.2, 8.3, 8.4, 8.5, 8.6: Component integration
 * - 18.5: React Query integration with caching
 * - 12.1-12.7: WebSocket real-time updates
 * - 4.1, 5.1, 15.7, 15.8: Mutation handlers
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useLocation } from 'react-router-dom';
import { adminService, AdminServiceError } from '@/services/adminService';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import { useToast } from '@/hooks/useToast';
import type {
  UserFilters,
  UserListItem,
  AdminUser,
  NewUserRegistrationMessage,
  UserApprovedMessage,
  UserRejectedMessage,
  UserRole,
} from '@/types/admin.types';

// Component imports
import { StatisticsCards } from '@/components/admin/StatisticsCards';
import { FilterBar } from '@/components/admin/FilterBar';
import { UserTable } from '@/components/admin/UserTable';
import { Pagination } from '@/components/admin/Pagination';
import { BulkActionsToolbar } from '@/components/admin/BulkActionsToolbar';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { ApprovalConfirmationDialog } from '@/components/admin/ApprovalConfirmationDialog';
import { RejectionDialog } from '@/components/admin/RejectionDialog';
import {
  BulkApprovalDialog,
  BulkRejectionDialog,
  BulkOperationSummaryDialog,
} from '@/components/admin/BulkConfirmationDialogs';
import { ToastContainer } from '@/components/admin/ToastContainer';

/**
 * Query keys for React Query
 */
const QUERY_KEYS = {
  users: (filters: UserFilters) => ['admin', 'users', filters],
  userDetail: (userId: string) => ['admin', 'user', userId],
  stats: ['admin', 'stats'],
};

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const initialRole = useMemo(() => {
    // Priority 1: Search params
    const roleParam = searchParams.get('role') as UserRole;
    if (roleParam) return roleParam;

    // Priority 2: Path name
    if (location.pathname.endsWith('/referees')) return 'REFEREE' as UserRole;
    if (location.pathname.endsWith('/organizers')) return 'ORGANIZER' as UserRole;
    if (location.pathname.endsWith('/venues') && location.pathname.includes('/admin/')) return 'VENUE_OWNER' as UserRole;

    return undefined;
  }, [searchParams, location.pathname]);

  // ===== STATE MANAGEMENT =====
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    page_size: 25,
    role: initialRole,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Toast management with deduplication
  const { toasts, showToast, dismissToast } = useToast();
  
  // Track pending mutations to prevent duplicate toasts
  const pendingMutationsRef = useRef<Set<string>>(new Set());

  // Dialog states
  const [approvalDialog, setApprovalDialog] = useState<{ isOpen: boolean; user: AdminUser | null }>({
    isOpen: false,
    user: null,
  });
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; user: AdminUser | null }>({
    isOpen: false,
    user: null,
  });
  const [bulkApprovalDialog, setBulkApprovalDialog] = useState(false);
  const [bulkRejectionDialog, setBulkRejectionDialog] = useState(false);
  const [bulkSummaryDialog, setBulkSummaryDialog] = useState<{
    isOpen: boolean;
    operation: 'approve' | 'reject';
    result: { successful: number; failed: number; total: number; errors?: string[] };
  }>({
    isOpen: false,
    operation: 'approve',
    result: { successful: 0, failed: 0, total: 0 },
  });



  // ===== REACT QUERY: USER LIST =====
  const {
    data: usersData,
    isLoading: isLoadingUsers,
  } = useQuery({
    queryKey: QUERY_KEYS.users(filters),
    queryFn: () => adminService.getUsers(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
  });

  // ===== REACT QUERY: USER STATISTICS =====
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => adminService.getUserStats(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ===== REACT QUERY: USER DETAIL =====
  const {
    data: userDetailData,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: selectedUser ? QUERY_KEYS.userDetail(selectedUser.id) : ['admin', 'user', 'none'],
    queryFn: () => selectedUser ? adminService.getUserDetail(selectedUser.id) : Promise.resolve(null),
    enabled: !!selectedUser && isDetailModalOpen,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ===== MUTATIONS: APPROVE USER =====
  const approveMutation = useMutation({
    mutationFn: (userId: string) => {
      pendingMutationsRef.current.add(`approve-${userId}`);
      return adminService.approveUser(userId);
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userDetail(data.id) });
      }

      // Show success toast (only from mutation, not WebSocket)
      showToast('success', 'User Approved', `${data.full_name} has been approved successfully.`);

      // Remove from pending mutations after a delay
      setTimeout(() => {
        pendingMutationsRef.current.delete(`approve-${data.id}`);
      }, 2000);

      // Close dialogs
      setApprovalDialog({ isOpen: false, user: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminServiceError, userId) => {
      pendingMutationsRef.current.delete(`approve-${userId}`);
      showToast('error', 'Approval Failed', error.message || 'Failed to approve user.');
    },
  });

  // ===== MUTATIONS: REJECT USER =====
  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => {
      pendingMutationsRef.current.add(`reject-${userId}`);
      return adminService.rejectUser(userId, reason);
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userDetail(data.id) });
      }

      // Show success toast (only from mutation, not WebSocket)
      showToast('success', 'User Rejected', `${data.full_name} has been rejected.`);

      // Remove from pending mutations after a delay
      setTimeout(() => {
        pendingMutationsRef.current.delete(`reject-${data.id}`);
      }, 2000);

      // Close dialogs
      setRejectionDialog({ isOpen: false, user: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminServiceError, { userId }) => {
      pendingMutationsRef.current.delete(`reject-${userId}`);
      showToast('error', 'Rejection Failed', error.message || 'Failed to reject user.');
    },
  });

  // ===== MUTATIONS: BULK APPROVE =====
  const bulkApproveMutation = useMutation({
    mutationFn: (userIds: string[]) => adminService.bulkApprove(userIds),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show summary dialog
      setBulkSummaryDialog({
        isOpen: true,
        operation: 'approve',
        result: {
          successful: data.approved_count || 0,
          failed: data.total_requested - (data.approved_count || 0),
          total: data.total_requested,
        },
      });

      // Clear selection
      setSelectedUserIds([]);
      setBulkApprovalDialog(false);
    },
    onError: (error: AdminServiceError) => {
      showToast('error', 'Bulk Approval Failed', error.message || 'Failed to approve users.');
      setBulkApprovalDialog(false);
    },
  });

  // ===== MUTATIONS: BULK REJECT =====
  const bulkRejectMutation = useMutation({
    mutationFn: ({ userIds, reason }: { userIds: string[]; reason: string }) =>
      adminService.bulkReject(userIds, reason),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show summary dialog
      setBulkSummaryDialog({
        isOpen: true,
        operation: 'reject',
        result: {
          successful: data.rejected_count || 0,
          failed: data.total_requested - (data.rejected_count || 0),
          total: data.total_requested,
        },
      });

      // Clear selection
      setSelectedUserIds([]);
      setBulkRejectionDialog(false);
    },
    onError: (error: AdminServiceError) => {
      showToast('error', 'Bulk Rejection Failed', error.message || 'Failed to reject users.');
      setBulkRejectionDialog(false);
    },
  });

  // ===== WEBSOCKET: REAL-TIME UPDATES =====
  const { connectionStatus } = useAdminWebSocket({
    onNewUserRegistration: (message: NewUserRegistrationMessage) => {
      // Invalidate queries to fetch new data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show toast notification
      showToast(
        'info',
        'New User Registration',
        `${message.user_name} (${message.user_role}) has registered and is awaiting approval.`
      );
    },
    onUserApproved: (message: UserApprovedMessage) => {
      // Skip toast if this was triggered by our own mutation
      const mutationKey = `approve-${message.user_id}`;
      if (pendingMutationsRef.current.has(mutationKey)) {
        console.log('Skipping duplicate toast for own approval action');
        return;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show toast notification only for other admins' actions
      showToast(
        'success',
        'User Approved',
        `${message.user_name} was approved by ${message.approved_by}.`
      );
    },
    onUserRejected: (message: UserRejectedMessage) => {
      // Skip toast if this was triggered by our own mutation
      const mutationKey = `reject-${message.user_id}`;
      if (pendingMutationsRef.current.has(mutationKey)) {
        console.log('Skipping duplicate toast for own rejection action');
        return;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show toast notification only for other admins' actions
      showToast(
        'warning',
        'User Rejected',
        `${message.user_name} was rejected by ${message.rejected_by}.`
      );
    },
    onConnectionError: () => {
      showToast('error', 'Connection Error', 'WebSocket connection lost. Real-time updates disabled.');
    },
  });

  // ===== EVENT HANDLERS =====
  const handleFiltersChange = useCallback((newFilters: UserFilters) => {
    setFilters(newFilters);
    setSelectedUserIds([]); // Clear selection on filter change
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedUserIds([]);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, page_size: pageSize, page: 1 }));
    setSelectedUserIds([]);
  }, []);

  const handleUserClick = useCallback((user: UserListItem) => {
    setSelectedUser(user as AdminUser);
    setIsDetailModalOpen(true);
  }, []);

  const handleApprove = useCallback((userId: string) => {
    const user = usersData?.results.find((u) => u.id === userId);
    if (user) {
      setApprovalDialog({ isOpen: true, user: user as AdminUser });
    }
  }, [usersData]);

  const handleReject = useCallback((userId: string) => {
    const user = usersData?.results.find((u) => u.id === userId);
    if (user) {
      setRejectionDialog({ isOpen: true, user: user as AdminUser });
    }
  }, [usersData]);

  const handleBulkApprove = useCallback(() => {
    setBulkApprovalDialog(true);
  }, []);

  const handleBulkReject = useCallback(() => {
    setBulkRejectionDialog(true);
  }, []);

  // ===== COMPUTED VALUES =====
  const totalPages = useMemo(() => {
    if (!usersData?.count || !filters.page_size) return 1;
    return Math.ceil(usersData.count / filters.page_size);
  }, [usersData?.count, filters.page_size]);

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* Skip Link for Keyboard Navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen Reader Announcements - ARIA Live Region for Table Updates */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoadingUsers && 'Loading users...'}
        {usersData && `Showing ${usersData.results.length} of ${usersData.count} users`}
      </div>

      {/* Screen Reader Announcements - ARIA Live Region for Selection */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedUserIds.length > 0 && `${selectedUserIds.length} users selected`}
      </div>

      {/* Header */}
      <header id="main-content" className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 mt-1">
              Efficiently manage registration requests and user statuses.
            </p>
          </div>

          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full" role="status" aria-live="polite">
            <div
              className={`w-2 h-2 rounded-full ${connectionStatus === 'connected'
                ? 'bg-green-500'
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-green-700">
              {connectionStatus === 'connected'
                ? 'Live Updates Active'
                : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : connectionStatus === 'error'
                    ? 'Connection Error'
                    : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <section aria-labelledby="statistics-heading">
        <h2 id="statistics-heading" className="sr-only">User Statistics</h2>
        <StatisticsCards stats={statsData} isLoading={isLoadingStats} />
      </section>

      {/* Filter Bar */}
      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">Filter Users</h2>
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      </section>

      {/* User Table */}
      <section aria-labelledby="users-table-heading">
        <h2 id="users-table-heading" className="sr-only">Users List</h2>
        <UserTable
          users={usersData?.results || []}
          selectedUserIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          onUserClick={handleUserClick}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={isLoadingUsers}
        />
      </section>

      {/* Pagination */}
      {usersData && (
        <Pagination
          currentPage={filters.page || 1}
          totalPages={totalPages}
          totalCount={usersData.count}
          pageSize={filters.page_size || 25}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedUserIds.length}
        onApproveSelected={handleBulkApprove}
        onRejectSelected={handleBulkReject}
        onClearSelection={() => setSelectedUserIds([])}
        isLoading={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        user={userDetailData || selectedUser}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUser(null);
        }}
        onApprove={(_userId) => {
          const user = userDetailData || selectedUser;
          if (user) {
            setApprovalDialog({ isOpen: true, user });
          }
        }}
        onReject={(_userId) => {
          const user = userDetailData || selectedUser;
          if (user) {
            setRejectionDialog({ isOpen: true, user });
          }
        }}
        isLoading={isLoadingDetail}
      />

      {/* Approval Confirmation Dialog */}
      {approvalDialog.user && (
        <ApprovalConfirmationDialog
          user={approvalDialog.user}
          isOpen={approvalDialog.isOpen}
          isLoading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate(approvalDialog.user!.id)}
          onCancel={() => setApprovalDialog({ isOpen: false, user: null })}
        />
      )}

      {/* Rejection Dialog */}
      {rejectionDialog.user && (
        <RejectionDialog
          user={rejectionDialog.user}
          isOpen={rejectionDialog.isOpen}
          isLoading={rejectMutation.isPending}
          onConfirm={(reason) =>
            rejectMutation.mutate({ userId: rejectionDialog.user!.id, reason })
          }
          onCancel={() => setRejectionDialog({ isOpen: false, user: null })}
        />
      )}

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        isOpen={bulkApprovalDialog}
        userCount={selectedUserIds.length}
        onConfirm={async () => {
          await bulkApproveMutation.mutateAsync(selectedUserIds);
        }}
        onCancel={() => setBulkApprovalDialog(false)}
      />

      {/* Bulk Rejection Dialog */}
      <BulkRejectionDialog
        isOpen={bulkRejectionDialog}
        userCount={selectedUserIds.length}
        onConfirm={async (reason) => {
          await bulkRejectMutation.mutateAsync({ userIds: selectedUserIds, reason });
        }}
        onCancel={() => setBulkRejectionDialog(false)}
      />

      {/* Bulk Operation Summary Dialog */}
      <BulkOperationSummaryDialog
        isOpen={bulkSummaryDialog.isOpen}
        operation={bulkSummaryDialog.operation}
        result={bulkSummaryDialog.result}
        onClose={() =>
          setBulkSummaryDialog({
            isOpen: false,
            operation: 'approve',
            result: { successful: 0, failed: 0, total: 0 },
          })
        }
      />

      {/* Toast Notifications Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
