/**
 * TournamentManagementPage - Admin page for managing tournament approvals
 * 
 * Integrates all admin components with React Query and WebSocket real-time updates.
 * Follows the same patterns as UserManagementPage with tournament-specific features.
 * 
 * Requirements:
 * - 8.1, 8.2: Tournament management page with statistics and filters
 * - 8.3, 8.4, 8.5: Tournament table with selection and actions
 * - 8.6, 8.7: Pagination and sorting
 * - 8.8: Toast notifications
 * - 11.1-11.5: Bulk operations
 * - 16.1-16.7: Enhanced UI features
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTournamentService, AdminTournamentServiceError } from '@/services/adminTournamentService';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import { useToast } from '@/hooks/useToast';
import type {
  TournamentFilters,
  TournamentListItem,
  AdminTournament,
} from '@/types/verification.types';
import type {
  TournamentSubmittedMessage,
  TournamentStatusChangedMessage,
} from '@/types/admin.types';

// Component imports
import { TournamentStatisticsCards } from '@/components/admin/TournamentStatisticsCards';
import { TournamentFilterBar } from '@/components/admin/TournamentFilterBar';
import { TournamentTable } from '@/components/admin/TournamentTable';
import { TournamentDetailModal } from '@/components/admin/TournamentDetailModal';
import { Pagination } from '@/components/admin/Pagination';
import { BulkActionsToolbar } from '@/components/admin/BulkActionsToolbar';
import { GenericApprovalDialog } from '@/components/admin/GenericApprovalDialog';
import { GenericRejectionDialog } from '@/components/admin/GenericRejectionDialog';
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
  tournaments: (filters: TournamentFilters) => ['admin', 'tournaments', filters],
  tournamentDetail: (tournamentId: string) => ['admin', 'tournament', tournamentId],
  stats: ['admin', 'tournament-stats'],
};

/**
 * TournamentManagementPage Component
 * 
 * Main admin page for tournament management with:
 * - Statistics dashboard
 * - Filtering and search
 * - Tournament table with sorting and pagination
 * - Bulk operations
 * - Real-time WebSocket updates
 * - Approval/rejection workflows
 */
export default function TournamentManagementPage() {
  const queryClient = useQueryClient();

  // ===== STATE MANAGEMENT =====
  const [filters, setFilters] = useState<TournamentFilters>({
    page: 1,
    page_size: 25,
  });
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<string[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<AdminTournament | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Toast management with deduplication
  const { toasts, showToast, dismissToast } = useToast();
  
  // Track pending mutations to prevent duplicate toasts
  const pendingMutationsRef = useRef<Set<string>>(new Set());

  // Dialog states
  const [approvalDialog, setApprovalDialog] = useState<{ isOpen: boolean; tournament: AdminTournament | null }>({
    isOpen: false,
    tournament: null,
  });
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; tournament: AdminTournament | null }>({
    isOpen: false,
    tournament: null,
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



  // ===== WEBSOCKET INTEGRATION =====
  // Real-time updates for tournament submissions and status changes
  useAdminWebSocket({
    onTournamentSubmitted: useCallback((message: TournamentSubmittedMessage) => {
      console.log('Tournament submitted:', message);
      
      // Show toast notification
      showToast(
        'info',
        'New Tournament Submitted',
        `${message.tournament_name} by ${message.organizer_name} requires review.`
      );

      // Auto-refresh statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      
      // Refresh tournament list if on first page
      if (filters.page === 1) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
      }
    }, [filters, queryClient, showToast]),

    onTournamentStatusChanged: useCallback((message: TournamentStatusChangedMessage) => {
      console.log('Tournament status changed:', message);
      
      // Show toast notification based on status
      const statusText = message.new_status === 'APPROVED' ? 'approved' : 
                        message.new_status === 'REJECTED' ? 'rejected' : 
                        'conditionally approved';
      
      showToast(
        message.new_status === 'APPROVED' ? 'success' : 
        message.new_status === 'REJECTED' ? 'error' : 'info',
        'Tournament Status Updated',
        `${message.tournament_name} has been ${statusText}.`
      );

      // Auto-refresh statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      
      // Refresh tournament list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
    }, [filters, queryClient, showToast]),
  });

  // ===== REACT QUERY: TOURNAMENT LIST =====
  const {
    data: tournamentsData,
    isLoading: isLoadingTournaments,
  } = useQuery({
    queryKey: QUERY_KEYS.tournaments(filters),
    queryFn: () => adminTournamentService.getTournaments(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // ===== REACT QUERY: TOURNAMENT STATISTICS =====
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => adminTournamentService.getTournamentStats(),
    staleTime: 0, // always refetch when invalidated
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Note: Tournament detail modal not yet implemented
  // Will be added in future task

  // ===== MUTATIONS: APPROVE TOURNAMENT =====
  const approveMutation = useMutation({
    mutationFn: (tournamentId: string) => {
      pendingMutationsRef.current.add(`approve-${tournamentId}`);
      return adminTournamentService.approveTournament(tournamentId);
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'Tournament Approved', `${data.title} has been approved successfully.`);

      // Remove from pending mutations after a delay
      setTimeout(() => {
        pendingMutationsRef.current.delete(`approve-${data.id}`);
      }, 2000);

      // Close dialogs
      setApprovalDialog({ isOpen: false, tournament: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminTournamentServiceError, tournamentId) => {
      pendingMutationsRef.current.delete(`approve-${tournamentId}`);
      showToast('error', 'Approval Failed', error.message || 'Failed to approve tournament.');
    },
  });

  // ===== MUTATIONS: REJECT TOURNAMENT =====
  const rejectMutation = useMutation({
    mutationFn: ({ tournamentId, reason }: { tournamentId: string; reason: string }) => {
      pendingMutationsRef.current.add(`reject-${tournamentId}`);
      return adminTournamentService.rejectTournament(tournamentId, reason);
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentDetail(data.id) });
      }

      // Show success toast
      showToast('success', 'Tournament Rejected', `${data.title} has been rejected.`);

      // Remove from pending mutations after a delay
      setTimeout(() => {
        pendingMutationsRef.current.delete(`reject-${data.id}`);
      }, 2000);

      // Close dialogs
      setRejectionDialog({ isOpen: false, tournament: null });
      setIsDetailModalOpen(false);
    },
    onError: (error: AdminTournamentServiceError, { tournamentId }) => {
      pendingMutationsRef.current.delete(`reject-${tournamentId}`);
      showToast('error', 'Rejection Failed', error.message || 'Failed to reject tournament.');
    },
  });

  // ===== MUTATIONS: BULK APPROVE =====
  const bulkApproveMutation = useMutation({
    mutationFn: (tournamentIds: string[]) => adminTournamentService.bulkApproveTournaments(tournamentIds),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
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
      setSelectedTournamentIds([]);
      setBulkApprovalDialog(false);
    },
    onError: (error: AdminTournamentServiceError) => {
      showToast('error', 'Bulk Approval Failed', error.message || 'Failed to approve tournaments.');
      setBulkApprovalDialog(false);
    },
  });

  // ===== MUTATIONS: BULK REJECT =====
  const bulkRejectMutation = useMutation({
    mutationFn: ({ tournamentIds, reason }: { tournamentIds: string[]; reason: string }) =>
      adminTournamentService.bulkRejectTournaments(tournamentIds, reason),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(filters) });
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
      setSelectedTournamentIds([]);
      setBulkRejectionDialog(false);
    },
    onError: (error: AdminTournamentServiceError) => {
      showToast('error', 'Bulk Rejection Failed', error.message || 'Failed to reject tournaments.');
      setBulkRejectionDialog(false);
    },
  });

  // ===== EVENT HANDLERS =====
  const handleFiltersChange = useCallback((newFilters: TournamentFilters) => {
    setFilters(newFilters);
    setSelectedTournamentIds([]); // Clear selection on filter change
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedTournamentIds([]);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, page_size: pageSize, page: 1 }));
    setSelectedTournamentIds([]);
  }, []);

  const handleTournamentClick = useCallback((tournament: TournamentListItem) => {
    setSelectedTournament(tournament as unknown as AdminTournament);
    setIsDetailModalOpen(true);
  }, []);

  const handleApprove = useCallback((tournamentId: string) => {
    const tournament = tournamentsData?.results.find((t) => t.id === tournamentId);
    if (tournament) {
      setApprovalDialog({ isOpen: true, tournament: tournament as unknown as AdminTournament });
    }
  }, [tournamentsData]);

  const handleReject = useCallback((tournamentId: string) => {
    const tournament = tournamentsData?.results.find((t) => t.id === tournamentId);
    if (tournament) {
      setRejectionDialog({ isOpen: true, tournament: tournament as unknown as AdminTournament });
    }
  }, [tournamentsData]);

  const handleBulkApprove = useCallback(() => {
    setBulkApprovalDialog(true);
  }, []);

  const handleBulkReject = useCallback(() => {
    setBulkRejectionDialog(true);
  }, []);

  // ===== COMPUTED VALUES =====
  const totalPages = useMemo(() => {
    if (!tournamentsData?.count || !filters.page_size) return 1;
    return Math.ceil(tournamentsData.count / filters.page_size);
  }, [tournamentsData?.count, filters.page_size]);

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
        {isLoadingTournaments && 'Loading tournaments...'}
        {tournamentsData && `Showing ${tournamentsData.results.length} of ${tournamentsData.count} tournaments`}
      </div>

      {/* Screen Reader Announcements - ARIA Live Region for Selection */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedTournamentIds.length > 0 && `${selectedTournamentIds.length} tournaments selected`}
      </div>

      {/* Header */}
      <header id="main-content" className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
            <p className="text-gray-500 mt-1">
              Efficiently manage tournament submissions and approval statuses.
            </p>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <section aria-labelledby="statistics-heading">
        <h2 id="statistics-heading" className="sr-only">Tournament Statistics</h2>
        <TournamentStatisticsCards stats={statsData} isLoading={isLoadingStats} />
      </section>

      {/* Filter Bar */}
      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">Filter Tournaments</h2>
        <TournamentFilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      </section>

      {/* Tournament Table */}
      <section aria-labelledby="tournaments-table-heading">
        <h2 id="tournaments-table-heading" className="sr-only">Tournaments List</h2>
        <TournamentTable
          tournaments={tournamentsData?.results || []}
          selectedTournamentIds={selectedTournamentIds}
          onSelectionChange={setSelectedTournamentIds}
          onTournamentClick={handleTournamentClick}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={isLoadingTournaments}
        />
      </section>

      {/* Pagination */}
      {tournamentsData && (
        <Pagination
          currentPage={filters.page || 1}
          totalPages={totalPages}
          totalCount={tournamentsData.count}
          pageSize={filters.page_size || 25}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedTournamentIds.length}
        onApproveSelected={handleBulkApprove}
        onRejectSelected={handleBulkReject}
        onClearSelection={() => setSelectedTournamentIds([])}
        isLoading={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
      />

      {/* Tournament Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTournament(null);
        }}
        onApprove={(tournamentId) => {
          // Close modal first, then show confirmation dialog
          setIsDetailModalOpen(false);
          const tournament = selectedTournament;
          if (tournament) {
            setApprovalDialog({ isOpen: true, tournament });
          }
        }}
        onReject={(tournamentId, reason) => {
          // Close modal first, then show rejection dialog
          setIsDetailModalOpen(false);
          const tournament = selectedTournament;
          if (tournament) {
            setRejectionDialog({ isOpen: true, tournament });
          }
        }}
        onConditionalApprove={(tournamentId, requestedDocuments) => {
          // TODO: Implement conditional approval for tournaments
          showToast('info', 'Feature Coming Soon', 'Conditional approval for tournaments will be available soon.');
          console.log('Conditional approval:', tournamentId, requestedDocuments);
        }}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      />

      {/* Approval Confirmation Dialog */}
      {approvalDialog.tournament && (
        <GenericApprovalDialog
          isOpen={approvalDialog.isOpen}
          isLoading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate(approvalDialog.tournament!.id)}
          onCancel={() => setApprovalDialog({ isOpen: false, tournament: null })}
          title="Approve Tournament"
          message="Are you sure you want to approve this tournament?"
          itemName={approvalDialog.tournament.title}
        />
      )}

      {/* Rejection Dialog */}
      {rejectionDialog.tournament && (
        <GenericRejectionDialog
          isOpen={rejectionDialog.isOpen}
          isLoading={rejectMutation.isPending}
          onConfirm={(reason) =>
            rejectMutation.mutate({ tournamentId: rejectionDialog.tournament!.id, reason })
          }
          onCancel={() => setRejectionDialog({ isOpen: false, tournament: null })}
          title="Reject Tournament"
          message="Please provide a reason for rejecting this tournament."
          itemName={rejectionDialog.tournament.title}
        />
      )}

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        isOpen={bulkApprovalDialog}
        userCount={selectedTournamentIds.length}
        onConfirm={async () => {
          await bulkApproveMutation.mutateAsync(selectedTournamentIds);
        }}
        onCancel={() => setBulkApprovalDialog(false)}
      />

      {/* Bulk Rejection Dialog */}
      <BulkRejectionDialog
        isOpen={bulkRejectionDialog}
        userCount={selectedTournamentIds.length}
        onConfirm={async (reason) => {
          await bulkRejectMutation.mutateAsync({ tournamentIds: selectedTournamentIds, reason });
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
