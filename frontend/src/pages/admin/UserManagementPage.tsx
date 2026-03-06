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

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, AdminServiceError } from '@/services/adminService';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import type {
  UserFilters,
  UserListItem,
  AdminUser,
  NewUserRegistrationMessage,
  UserApprovedMessage,
  UserRejectedMessage,
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
import { Toast, type ToastMessage } from '@/components/admin/Toast';

/**
 * Query keys for React Query
 */
const QUERY_KEYS = {
  users: (filters: UserFilters) => ['admin', 'users', filters],
  userDetail: (userId: string) => ['admin', 'user', userId],
  stats: ['admin', 'stats'],
};

/**
 * UserManagementPage Component
 * 
 * Main admin page for user management with:
 * - Statistics dashboard
 * - Filtering and search
 * - User table with sorting and pagination
 * - Bulk operations
 * - Real-time WebSocket updates
 * - Approval/rejection workflows
 */
export default function UserManagementPage() {
  const queryClient = useQueryClient();

  // ===== STATE MANAGEMENT =====
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    page_size: 25,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  // ===== TOAST MANAGEMENT =====
  const showToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // ===== REACT QUERY: USER LIST =====
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
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
    mutationFn: (userId: string) => adminService.approveUser(userId),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'User Approved', `${data.full_name} has been approved successfully.`);

      // Close dialogs
      setApprovalDialog({ isOpen: false, user: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminServiceError) => {
      showToast('error', 'Approval Failed', error.message || 'Failed to approve user.');
    },
  });

  // ===== MUTATIONS: REJECT USER =====
  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.rejectUser(userId, reason),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'User Rejected', `${data.full_name} has been rejected.`);

      // Close dialogs
      setRejectionDialog({ isOpen: false, user: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminServiceError) => {
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
  const { connectionStatus, isConnected } = useAdminWebSocket({
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
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show toast notification
      showToast(
        'success',
        'User Approved',
        `${message.user_name} was approved by ${message.approved_by}.`
      );
    },
    onUserRejected: (message: UserRejectedMessage) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show toast notification
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
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
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
        onApprove={(userId) => {
          const user = userDetailData || selectedUser;
          if (user) {
            setApprovalDialog({ isOpen: true, user });
          }
        }}
        onReject={(userId) => {
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

      {/* Toast Notifications - ARIA Live Region */}
      <div
        className="fixed top-4 right-4 z-50 space-y-2"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
