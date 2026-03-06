/**
 * Admin Tournament Service
 * 
 * Service layer for admin tournament management and approval workflow.
 * Provides methods for tournament listing, filtering, approval, rejection, and statistics.
 * 
 * Requirements:
 * - 4.1, 4.2: Tournament listing and detail endpoints
 * - 4.3, 4.4: Approval and rejection endpoints
 * - 4.5, 4.6: Bulk operations support
 * - 4.7: Statistics endpoint
 * - 14.2: Conditional approval workflow
 */

import api from './api';
import type {
  AdminTournament,
  TournamentFilters,
  TournamentStats,
  PaginatedTournaments,
  TournamentRejectionRequest,
  TournamentBulkApprovalRequest,
  TournamentBulkRejectionRequest,
  TournamentConditionalApprovalRequest,
  BulkOperationResult,
} from '@/types/verification.types';

/**
 * Error types for categorizing admin tournament service errors
 */
export const AdminTournamentErrorType = {
  NETWORK: 'NETWORK',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  AUTHENTICATION: 'AUTHENTICATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
} as const;

export type AdminTournamentErrorType = typeof AdminTournamentErrorType[keyof typeof AdminTournamentErrorType];

/**
 * Custom error class for admin tournament service operations
 * Requirement 23.1: Error handling with specific error types
 */
export class AdminTournamentServiceError extends Error {
  statusCode?: number;
  details?: any;
  type: AdminTournamentErrorType;
  isRetryable: boolean;

  constructor(
    message: string,
    type: AdminTournamentErrorType = AdminTournamentErrorType.UNKNOWN,
    statusCode?: number,
    details?: any,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AdminTournamentServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isRetryable = isRetryable;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, AdminTournamentServiceError);
    }
  }

  /**
   * Create error from axios error response
   */
  static fromAxiosError(error: any): AdminTournamentServiceError {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    const errorMessage = responseData?.error || responseData?.message || error.message;

    // Network errors (no response)
    if (!error.response) {
      return new AdminTournamentServiceError(
        'Network error. Please check your internet connection and try again.',
        AdminTournamentErrorType.NETWORK,
        undefined,
        error,
        true
      );
    }

    // Categorize by status code
    switch (statusCode) {
      case 400:
        return new AdminTournamentServiceError(
          errorMessage || 'Invalid request. Please check your input.',
          AdminTournamentErrorType.VALIDATION,
          400,
          responseData,
          false
        );

      case 401:
        return new AdminTournamentServiceError(
          'Authentication required. Please log in.',
          AdminTournamentErrorType.AUTHENTICATION,
          401,
          responseData,
          false
        );

      case 403:
        return new AdminTournamentServiceError(
          errorMessage || 'You do not have permission to perform this action. Admin access required.',
          AdminTournamentErrorType.PERMISSION,
          403,
          responseData,
          false
        );

      case 404:
        return new AdminTournamentServiceError(
          errorMessage || 'The requested tournament was not found.',
          AdminTournamentErrorType.NOT_FOUND,
          404,
          responseData,
          false
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new AdminTournamentServiceError(
          'Server error. Please try again later.',
          AdminTournamentErrorType.SERVER,
          statusCode,
          responseData,
          true
        );

      default:
        return new AdminTournamentServiceError(
          errorMessage || 'An unexpected error occurred. Please try again.',
          AdminTournamentErrorType.UNKNOWN,
          statusCode,
          responseData,
          true
        );
    }
  }

  getUserMessage(): string {
    return this.message;
  }

  isType(type: AdminTournamentErrorType): boolean {
    return this.type === type;
  }
}

/**
 * Base URL for admin tournament API endpoints
 */
const ADMIN_TOURNAMENT_API_BASE = '/api/tournaments/admin/tournaments';

/**
 * Admin Tournament Service
 * Provides methods for admin tournament management operations
 */
class AdminTournamentService {
  /**
   * Get paginated list of tournaments with optional filtering
   * 
   * Requirement 4.1: Tournament listing endpoint with filtering
   * Requirement 4.8: Pagination support
   * 
   * @param filters - Optional filters for sport_type, status, organizer, date_range, search
   * @returns Paginated list of tournaments
   * @throws AdminTournamentServiceError on API failure
   */
  async getTournaments(filters?: TournamentFilters): Promise<PaginatedTournaments> {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query parameters
      if (filters?.sport_type) {
        params.append('sport_type', filters.sport_type);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.organizer) {
        params.append('organizer', filters.organizer);
      }
      if (filters?.date_from) {
        params.append('date_from', filters.date_from);
      }
      if (filters?.date_to) {
        params.append('date_to', filters.date_to);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      if (filters?.page_size) {
        params.append('page_size', filters.page_size.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `${ADMIN_TOURNAMENT_API_BASE}/?${queryString}` : `${ADMIN_TOURNAMENT_API_BASE}/`;
      
      const response = await api.get<PaginatedTournaments>(url);
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.getTournaments error:', error);
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get detailed information for a specific tournament with validation results
   * 
   * Requirement 4.2: Tournament detail endpoint
   * Requirement 12.6: Include validation results in response
   * 
   * @param tournamentId - Tournament ID to retrieve
   * @returns Detailed tournament information with validation results
   * @throws AdminTournamentServiceError on API failure
   */
  async getTournamentById(tournamentId: string): Promise<AdminTournament> {
    try {
      const response = await api.get<AdminTournament>(`${ADMIN_TOURNAMENT_API_BASE}/${tournamentId}/`);
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.getTournamentById error:', error);
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve a pending tournament
   * 
   * Requirement 4.3: Approval endpoint
   * Requirement 1.3: Update approval_status to APPROVED
   * Requirement 1.6: Create audit log entry
   * 
   * @param tournamentId - Tournament ID to approve
   * @param approvalNotes - Optional notes from admin
   * @returns Updated tournament information
   * @throws AdminTournamentServiceError on API failure
   */
  async approveTournament(tournamentId: string, approvalNotes?: string): Promise<AdminTournament> {
    try {
      const payload: any = {};
      if (approvalNotes) {
        payload.approval_notes = approvalNotes.trim();
      }

      const response = await api.patch<AdminTournament>(
        `${ADMIN_TOURNAMENT_API_BASE}/${tournamentId}/approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.approveTournament error:', error);
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject a tournament with reason
   * 
   * Requirement 4.4: Rejection endpoint
   * Requirement 1.4: Update approval_status to REJECTED
   * Requirement 1.6: Create audit log entry
   * 
   * @param tournamentId - Tournament ID to reject
   * @param rejectionReason - Reason for rejection (required)
   * @returns Updated tournament information
   * @throws AdminTournamentServiceError on API failure
   */
  async rejectTournament(tournamentId: string, rejectionReason: string): Promise<AdminTournament> {
    try {
      // Client-side validation for rejection reason
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminTournamentServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: TournamentRejectionRequest = {
        tournament_id: tournamentId,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.patch<AdminTournament>(
        `${ADMIN_TOURNAMENT_API_BASE}/${tournamentId}/reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.rejectTournament error:', error);
      
      if (error instanceof AdminTournamentServiceError) {
        throw error;
      }
      
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Set tournament to conditional approval and request additional documents
   * 
   * Requirement 14.1: Conditional approval status
   * Requirement 14.2: Store requested_documents
   * Requirement 14.6: Create audit log entry
   * 
   * @param tournamentId - Tournament ID for conditional approval
   * @param requestedDocuments - List of documents to request
   * @returns Updated tournament information
   * @throws AdminTournamentServiceError on API failure
   */
  async conditionalApproveTournament(
    tournamentId: string,
    requestedDocuments: string[]
  ): Promise<AdminTournament> {
    try {
      // Client-side validation
      if (!requestedDocuments || requestedDocuments.length === 0) {
        throw new AdminTournamentServiceError(
          'At least one document must be requested for conditional approval.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'requested_documents', minLength: 1 },
          false
        );
      }

      const payload: TournamentConditionalApprovalRequest = {
        tournament_id: tournamentId,
        requested_documents: requestedDocuments,
      };

      const response = await api.patch<AdminTournament>(
        `${ADMIN_TOURNAMENT_API_BASE}/${tournamentId}/conditional-approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.conditionalApproveTournament error:', error);
      
      if (error instanceof AdminTournamentServiceError) {
        throw error;
      }
      
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve multiple tournaments at once
   * 
   * Requirement 4.5: Bulk approve endpoint
   * Requirement 11.2: Bulk operations with max 50 items
   * Requirement 19.2: Limit bulk operations to 50 items per request
   * 
   * @param tournamentIds - Array of tournament IDs to approve (max 50)
   * @returns Bulk operation result with counts
   * @throws AdminTournamentServiceError on API failure
   */
  async bulkApproveTournaments(tournamentIds: string[]): Promise<BulkOperationResult> {
    try {
      // Client-side validation
      if (!tournamentIds || tournamentIds.length === 0) {
        throw new AdminTournamentServiceError(
          'At least one tournament must be selected for bulk approval.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'tournament_ids', minLength: 1 },
          false
        );
      }

      if (tournamentIds.length > 50) {
        throw new AdminTournamentServiceError(
          'Bulk operations are limited to 50 items per request.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'tournament_ids', maxLength: 50 },
          false
        );
      }

      const payload: TournamentBulkApprovalRequest = {
        tournament_ids: tournamentIds,
      };

      const response = await api.post<BulkOperationResult>(
        `${ADMIN_TOURNAMENT_API_BASE}/bulk-approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.bulkApproveTournaments error:', error);
      
      if (error instanceof AdminTournamentServiceError) {
        throw error;
      }
      
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject multiple tournaments with a single reason
   * 
   * Requirement 4.6: Bulk reject endpoint
   * Requirement 11.3: Bulk operations with detailed error reporting
   * Requirement 19.2: Limit bulk operations to 50 items per request
   * 
   * @param tournamentIds - Array of tournament IDs to reject (max 50)
   * @param rejectionReason - Reason for rejection (applies to all tournaments)
   * @returns Bulk operation result with counts
   * @throws AdminTournamentServiceError on API failure
   */
  async bulkRejectTournaments(
    tournamentIds: string[],
    rejectionReason: string
  ): Promise<BulkOperationResult> {
    try {
      // Client-side validation
      if (!tournamentIds || tournamentIds.length === 0) {
        throw new AdminTournamentServiceError(
          'At least one tournament must be selected for bulk rejection.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'tournament_ids', minLength: 1 },
          false
        );
      }

      if (tournamentIds.length > 50) {
        throw new AdminTournamentServiceError(
          'Bulk operations are limited to 50 items per request.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'tournament_ids', maxLength: 50 },
          false
        );
      }

      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminTournamentServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminTournamentErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: TournamentBulkRejectionRequest = {
        tournament_ids: tournamentIds,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.post<BulkOperationResult>(
        `${ADMIN_TOURNAMENT_API_BASE}/bulk-reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.bulkRejectTournaments error:', error);
      
      if (error instanceof AdminTournamentServiceError) {
        throw error;
      }
      
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get aggregated tournament statistics for dashboard
   * 
   * Requirement 4.7: Statistics endpoint
   * Requirement 20.5: Implement 60-second caching
   * 
   * @returns Tournament statistics including counts by status and sport_type
   * @throws AdminTournamentServiceError on API failure
   */
  async getTournamentStats(): Promise<TournamentStats> {
    try {
      console.log('[AdminTournamentService] Fetching tournament stats from:', `${ADMIN_TOURNAMENT_API_BASE}/stats/`);
      const response = await api.get<TournamentStats>(`${ADMIN_TOURNAMENT_API_BASE}/stats/`);
      console.log('[AdminTournamentService] Tournament stats response:', response.data);
      console.log('[AdminTournamentService] Tournament stats field values:', {
        total: response.data.total,
        pending: response.data.pending,
        approved: response.data.approved,
        rejected: response.data.rejected,
        conditional_approvals: response.data.conditional_approvals
      });
      return response.data;
    } catch (error: any) {
      console.error('AdminTournamentService.getTournamentStats error:', error);
      throw AdminTournamentServiceError.fromAxiosError(error);
    }
  }
}

// Export singleton instance
export const adminTournamentService = new AdminTournamentService();

// Export class for testing purposes
export default adminTournamentService;
