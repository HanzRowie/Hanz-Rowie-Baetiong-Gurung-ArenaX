/**
 * VenueManagementPage - Admin page for managing venue approvals
 * 
 * Integrates all admin components with React Query and WebSocket real-time updates.
 * Follows the same patterns as TournamentManagementPage with venue-specific features.
 * 
 * Requirements:
 * - 9.1, 9.2: Venue management page with statistics and filters
 * - 9.3, 9.4, 9.5: Venue table with selection and actions
 * - 9.6, 9.7: Pagination and sorting
 * - 9.8: Toast notifications
 * - 11.1-11.6: Bulk operations
 * - 16.1-16.7: Enhanced UI features
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminVenueService, AdminVenueServiceError } from '@/services/adminVenueService';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import type {
  VenueFilters,
  VenueListItem,
  AdminVenue,
} from '@/types/verification.types';
import type {
  VenueSubmittedMessage,
  VenueStatusChangedMessage,
} from '@/types/admin.types';

// Component imports
import { VenueStatisticsCards } from '@/components/admin/VenueStatisticsCards';
import { VenueFilterBar } from '@/components/admin/VenueFilterBar';
import { VenueTable } from '@/components/admin/VenueTable';
import { VenueDetailModal } from '@/components/admin/VenueDetailModal';
import { Pagination } from '@/components/admin/Pagination';
import { BulkActionsToolbar } from '@/components/admin/BulkActionsToolbar';
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
  venues: (filters: VenueFilters) => ['admin', 'venues', filters],
  venueDetail: (venueId: string) => ['admin', 'venue', venueId],
  stats: ['admin', 'venue-stats'],
};

/**
 * VenueManagementPage Component
 * 
 * Main admin page for venue management with:
 * - Statistics dashboard
 * - Filtering and search
 * - Venue table with sorting and pagination
 * - Bulk operations
 * - Real-time WebSocket updates
 * - Approval/rejection workflows
 */
export default function VenueManagementPage() {
  const queryClient = useQueryClient();

  // ===== STATE MANAGEMENT =====
  const [filters, setFilters] = useState<VenueFilters>({
    page: 1,
    page_size: 25,
  });
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<AdminVenue | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dialog states
  const [approvalDialog, setApprovalDialog] = useState<{ isOpen: boolean; venue: AdminVenue | null }>({
    isOpen: false,
    venue: null,
  });
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; venue: AdminVenue | null }>({
    isOpen: false,
    venue: null,
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

  // ===== WEBSOCKET INTEGRATION =====
  // Real-time updates for venue submissions and status changes
  const { connectionStatus } = useAdminWebSocket({
    onVenueSubmitted: useCallback((message: VenueSubmittedMessage) => {
      console.log('Venue submitted:', message);
      
      // Show toast notification
      showToast(
        'info',
        'New Venue Submitted',
        `${message.venue_name} by ${message.owner_name} requires review.`
      );

      // Auto-refresh statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      
      // Refresh venue list if on first page
      if (filters.page === 1) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      }
    }, [filters, queryClient, showToast]),

    onVenueStatusChanged: useCallback((message: VenueStatusChangedMessage) => {
      console.log('Venue status changed:', message);
      
      // Show toast notification based on status
      const statusText = message.new_status === 'APPROVED' ? 'approved' : 
                        message.new_status === 'REJECTED' ? 'rejected' : 
                        'conditionally approved';
      
      showToast(
        message.new_status === 'APPROVED' ? 'success' : 
        message.new_status === 'REJECTED' ? 'error' : 'info',
        'Venue Status Updated',
        `${message.venue_name} has been ${statusText}.`
      );

      // Auto-refresh statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      
      // Refresh venue list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
    }, [filters, queryClient, showToast]),
  });

  // ===== REACT QUERY: VENUE LIST =====
  const {
    data: venuesData,
    isLoading: isLoadingVenues,
  } = useQuery({
    queryKey: QUERY_KEYS.venues(filters),
    queryFn: () => adminVenueService.getVenues(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // ===== REACT QUERY: VENUE STATISTICS =====
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => adminVenueService.getVenueStats(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Note: Venue detail query will be added when VenueDetailModal is implemented (Task 19)
  const {
    data: venueDetail,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: QUERY_KEYS.venueDetail(selectedVenue?.id || ''),
    queryFn: () => adminVenueService.getVenueById(selectedVenue!.id),
    enabled: !!selectedVenue && isDetailModalOpen,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ===== MUTATIONS: APPROVE VENUE =====
  const approveMutation = useMutation({
    mutationFn: (venueId: string) => adminVenueService.approveVenue(venueId),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venueDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'Venue Approved', `${data.name} has been approved successfully.`);

      // Close dialogs
      setApprovalDialog({ isOpen: false, venue: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminVenueServiceError) => {
      showToast('error', 'Approval Failed', error.message || 'Failed to approve venue.');
    },
  });

  // ===== MUTATIONS: REJECT VENUE =====
  const rejectMutation = useMutation({
    mutationFn: ({ venueId, reason }: { venueId: string; reason: string }) =>
      adminVenueService.rejectVenue(venueId, reason),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venueDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'Venue Rejected', `${data.name} has been rejected.`);

      // Close dialogs
      setRejectionDialog({ isOpen: false, venue: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminVenueServiceError) => {
      showToast('error', 'Rejection Failed', error.message || 'Failed to reject venue.');
    },
  });

  // ===== MUTATIONS: CONDITIONAL APPROVE VENUE =====
  const conditionalApproveMutation = useMutation({
    mutationFn: ({ venueId, requestedDocuments }: { venueId: string; requestedDocuments: string[] }) =>
      adminVenueService.conditionalApproveVenue(venueId, requestedDocuments),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venueDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'Documents Requested', `Additional documents have been requested for ${data.name}.`);

      // Close modal
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminVenueServiceError) => {
      showToast('error', 'Request Failed', error.message || 'Failed to request documents.');
    },
  });

  // ===== MUTATIONS: BULK APPROVE =====
  const bulkApproveMutation = useMutation({
    mutationFn: (venueIds: string[]) => adminVenueService.bulkApproveVenues(venueIds),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show summary dialog
      setBulkSummaryDialog({
        isOpen: true,
        operation: 'approve',
        result: {
          successful: data.success_count || 0,
          failed: data.failure_count || 0,
          total: data.total_requested,
        },
      });

      // Clear selection
      setSelectedVenueIds([]);
      setBulkApprovalDialog(false);
    },
    onError: (error: AdminVenueServiceError) => {
      showToast('error', 'Bulk Approval Failed', error.message || 'Failed to approve venues.');
      setBulkApprovalDialog(false);
    },
  });

  // ===== MUTATIONS: BULK REJECT =====
  const bulkRejectMutation = useMutation({
    mutationFn: ({ venueIds, reason }: { venueIds: string[]; reason: string }) =>
      adminVenueService.bulkRejectVenues(venueIds, reason),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.venues(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });

      // Show summary dialog
      setBulkSummaryDialog({
        isOpen: true,
        operation: 'reject',
        result: {
          successful: data.success_count || 0,
          failed: data.failure_count || 0,
          total: data.total_requested,
        },
      });

      // Clear selection
      setSelectedVenueIds([]);
      setBulkRejectionDialog(false);
    },
    onError: (error: AdminVenueServiceError) => {
      showToast('error', 'Bulk Rejection Failed', error.message || 'Failed to reject venues.');
      setBulkRejectionDialog(false);
    },
  });

  // ===== EVENT HANDLERS =====
  const handleFiltersChange = useCallback((newFilters: VenueFilters) => {
    setFilters(newFilters);
    setSelectedVenueIds([]); // Clear selection on filter change
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedVenueIds([]);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, page_size: pageSize, page: 1 }));
    setSelectedVenueIds([]);
  }, []);

  const handleVenueClick = useCallback((venue: VenueListItem) => {
    // Fetch full venue details when clicked
    setSelectedVenue(venue as unknown as AdminVenue);
    setIsDetailModalOpen(true);
  }, []);

  const handleApprove = useCallback((venueId: string) => {
    const venue = venuesData?.results.find((v) => v.id === venueId);
    if (venue) {
      setApprovalDialog({ isOpen: true, venue: venue as unknown as AdminVenue });
    }
  }, [venuesData]);

  const handleReject = useCallback((venueId: string) => {
    const venue = venuesData?.results.find((v) => v.id === venueId);
    if (venue) {
      setRejectionDialog({ isOpen: true, venue: venue as unknown as AdminVenue });
    }
  }, [venuesData]);

  const handleBulkApprove = useCallback(() => {
    setBulkApprovalDialog(true);
  }, []);

  const handleBulkReject = useCallback(() => {
    setBulkRejectionDialog(true);
  }, []);

  // ===== COMPUTED VALUES =====
  const totalPages = useMemo(() => {
    if (!venuesData?.count || !filters.page_size) return 1;
    return Math.ceil(venuesData.count / filters.page_size);
  }, [venuesData?.count, filters.page_size]);

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
        {isLoadingVenues && 'Loading venues...'}
        {venuesData && `Showing ${venuesData.results.length} of ${venuesData.count} venues`}
      </div>

      {/* Screen Reader Announcements - ARIA Live Region for Selection */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedVenueIds.length > 0 && `${selectedVenueIds.length} venues selected`}
      </div>

      {/* Header */}
      <header id="main-content" className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
            <p className="text-gray-500 mt-1">
              Efficiently manage venue submissions and approval statuses.
            </p>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <section aria-labelledby="statistics-heading">
        <h2 id="statistics-heading" className="sr-only">Venue Statistics</h2>
        <VenueStatisticsCards stats={statsData} isLoading={isLoadingStats} />
      </section>

      {/* Filter Bar */}
      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">Filter Venues</h2>
        <VenueFilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      </section>

      {/* Venue Table */}
      <section aria-labelledby="venues-table-heading">
        <h2 id="venues-table-heading" className="sr-only">Venues List</h2>
        <VenueTable
          venues={venuesData?.results || []}
          selectedVenueIds={selectedVenueIds}
          onSelectionChange={setSelectedVenueIds}
          onVenueClick={handleVenueClick}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={isLoadingVenues}
        />
      </section>

      {/* Pagination */}
      {venuesData && (
        <Pagination
          currentPage={filters.page || 1}
          totalPages={totalPages}
          totalCount={venuesData.count}
          pageSize={filters.page_size || 25}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedVenueIds.length}
        onApproveSelected={handleBulkApprove}
        onRejectSelected={handleBulkReject}
        onClearSelection={() => setSelectedVenueIds([])}
        isLoading={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
      />

      {/* Venue Detail Modal */}
      <VenueDetailModal
        venue={venueDetail || selectedVenue}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedVenue(null);
        }}
        onApprove={(venueId, notes) => approveMutation.mutate(venueId)}
        onReject={(venueId, reason) => rejectMutation.mutate({ venueId, reason })}
        onConditionalApprove={(venueId, requestedDocuments) =>
          conditionalApproveMutation.mutate({ venueId, requestedDocuments })
        }
        isLoading={approveMutation.isPending || rejectMutation.isPending || conditionalApproveMutation.isPending || isLoadingDetail}
      />

      {/* Approval Confirmation Dialog */}
      {approvalDialog.venue && (
        <ApprovalConfirmationDialog
          user={approvalDialog.venue as any} // Reusing user dialog for now
          isOpen={approvalDialog.isOpen}
          isLoading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate(approvalDialog.venue!.id)}
          onCancel={() => setApprovalDialog({ isOpen: false, venue: null })}
        />
      )}

      {/* Rejection Dialog */}
      {rejectionDialog.venue && (
        <RejectionDialog
          user={rejectionDialog.venue as any} // Reusing user dialog for now
          isOpen={rejectionDialog.isOpen}
          isLoading={rejectMutation.isPending}
          onConfirm={(reason) =>
            rejectMutation.mutate({ venueId: rejectionDialog.venue!.id, reason })
          }
          onCancel={() => setRejectionDialog({ isOpen: false, venue: null })}
        />
      )}

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        isOpen={bulkApprovalDialog}
        userCount={selectedVenueIds.length}
        onConfirm={async () => {
          await bulkApproveMutation.mutateAsync(selectedVenueIds);
        }}
        onCancel={() => setBulkApprovalDialog(false)}
      />

      {/* Bulk Rejection Dialog */}
      <BulkRejectionDialog
        isOpen={bulkRejectionDialog}
        userCount={selectedVenueIds.length}
        onConfirm={async (reason) => {
          await bulkRejectMutation.mutateAsync({ venueIds: selectedVenueIds, reason });
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
