/**
 * Admin Venue Service
 * 
 * Service layer for admin venue management and approval workflow.
 * Provides methods for venue listing, filtering, approval, rejection, and statistics.
 * 
 * Requirements:
 * - 5.1, 5.2: Venue listing and detail endpoints
 * - 5.3, 5.4: Approval and rejection endpoints
 * - 5.5, 5.6: Bulk operations support
 * - 5.7: Statistics endpoint
 * - 14.2: Conditional approval workflow
 */

import api from './api';
import type {
  AdminVenue,
  VenueFilters,
  VenueStats,
  PaginatedVenues,
  VenueRejectionRequest,
  VenueBulkApprovalRequest,
  VenueBulkRejectionRequest,
  VenueConditionalApprovalRequest,
  BulkOperationResult,
} from '@/types/verification.types';

/**
 * Error types for categorizing admin venue service errors
 */
export const AdminVenueErrorType = {
  NETWORK: 'NETWORK',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  AUTHENTICATION: 'AUTHENTICATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
} as const;

export type AdminVenueErrorType = typeof AdminVenueErrorType[keyof typeof AdminVenueErrorType];

/**
 * Custom error class for admin venue service operations
 * Requirement 23.1: Error handling with specific error types
 */
export class AdminVenueServiceError extends Error {
  statusCode?: number;
  details?: any;
  type: AdminVenueErrorType;
  isRetryable: boolean;

  constructor(
    message: string,
    type: AdminVenueErrorType = AdminVenueErrorType.UNKNOWN,
    statusCode?: number,
    details?: any,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AdminVenueServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isRetryable = isRetryable;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, AdminVenueServiceError);
    }
  }

  /**
   * Create error from axios error response
   */
  static fromAxiosError(error: any): AdminVenueServiceError {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    const errorMessage = responseData?.error || responseData?.message || error.message;

    // Network errors (no response)
    if (!error.response) {
      return new AdminVenueServiceError(
        'Network error. Please check your internet connection and try again.',
        AdminVenueErrorType.NETWORK,
        undefined,
        error,
        true
      );
    }

    // Categorize by status code
    switch (statusCode) {
      case 400:
        return new AdminVenueServiceError(
          errorMessage || 'Invalid request. Please check your input.',
          AdminVenueErrorType.VALIDATION,
          400,
          responseData,
          false
        );

      case 401:
        return new AdminVenueServiceError(
          'Authentication required. Please log in.',
          AdminVenueErrorType.AUTHENTICATION,
          401,
          responseData,
          false
        );

      case 403:
        return new AdminVenueServiceError(
          errorMessage || 'You do not have permission to perform this action. Admin access required.',
          AdminVenueErrorType.PERMISSION,
          403,
          responseData,
          false
        );

      case 404:
        return new AdminVenueServiceError(
          errorMessage || 'The requested venue was not found.',
          AdminVenueErrorType.NOT_FOUND,
          404,
          responseData,
          false
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new AdminVenueServiceError(
          'Server error. Please try again later.',
          AdminVenueErrorType.SERVER,
          statusCode,
          responseData,
          true
        );

      default:
        return new AdminVenueServiceError(
          errorMessage || 'An unexpected error occurred. Please try again.',
          AdminVenueErrorType.UNKNOWN,
          statusCode,
          responseData,
          true
        );
    }
  }

  getUserMessage(): string {
    return this.message;
  }

  isType(type: AdminVenueErrorType): boolean {
    return this.type === type;
  }
}

/**
 * Base URL for admin venue API endpoints
 */
const ADMIN_VENUE_API_BASE = '/api/venues/admin/venues';

/**
 * Admin Venue Service
 * Provides methods for admin venue management operations
 */
class AdminVenueService {
  /**
   * Get paginated list of venues with optional filtering
   * 
   * Requirement 5.1: Venue listing endpoint with filtering
   * Requirement 5.8: Pagination support
   * 
   * @param filters - Optional filters for sport_type, status, owner, date_range, search
   * @returns Paginated list of venues
   * @throws AdminVenueServiceError on API failure
   */
  async getVenues(filters?: VenueFilters): Promise<PaginatedVenues> {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query parameters
      if (filters?.sport_type) {
        params.append('sport_type', filters.sport_type);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.owner) {
        params.append('owner', filters.owner);
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
      const url = queryString ? `${ADMIN_VENUE_API_BASE}/?${queryString}` : `${ADMIN_VENUE_API_BASE}/`;
      
      const response = await api.get<PaginatedVenues>(url);
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.getVenues error:', error);
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get detailed information for a specific venue with validation results
   * 
   * Requirement 5.2: Venue detail endpoint
   * Requirement 13.6: Include validation results in response
   * 
   * @param venueId - Venue ID to retrieve
   * @returns Detailed venue information with validation results
   * @throws AdminVenueServiceError on API failure
   */
  async getVenueById(venueId: string): Promise<AdminVenue> {
    try {
      const response = await api.get<AdminVenue>(`${ADMIN_VENUE_API_BASE}/${venueId}/`);
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.getVenueById error:', error);
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve a pending venue
   * 
   * Requirement 5.3: Approval endpoint
   * Requirement 2.3: Update approval_status to APPROVED
   * Requirement 2.6: Create audit log entry
   * 
   * @param venueId - Venue ID to approve
   * @param approvalNotes - Optional notes from admin
   * @returns Updated venue information
   * @throws AdminVenueServiceError on API failure
   */
  async approveVenue(venueId: string, approvalNotes?: string): Promise<AdminVenue> {
    try {
      const payload: any = {};
      if (approvalNotes) {
        payload.approval_notes = approvalNotes.trim();
      }

      const response = await api.patch<AdminVenue>(
        `${ADMIN_VENUE_API_BASE}/${venueId}/approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.approveVenue error:', error);
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject a venue with reason
   * 
   * Requirement 5.4: Rejection endpoint
   * Requirement 2.4: Update approval_status to REJECTED
   * Requirement 2.6: Create audit log entry
   * 
   * @param venueId - Venue ID to reject
   * @param rejectionReason - Reason for rejection (required)
   * @returns Updated venue information
   * @throws AdminVenueServiceError on API failure
   */
  async rejectVenue(venueId: string, rejectionReason: string): Promise<AdminVenue> {
    try {
      // Client-side validation for rejection reason
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminVenueServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: VenueRejectionRequest = {
        venue_id: venueId,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.patch<AdminVenue>(
        `${ADMIN_VENUE_API_BASE}/${venueId}/reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.rejectVenue error:', error);
      
      if (error instanceof AdminVenueServiceError) {
        throw error;
      }
      
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Set venue to conditional approval and request additional documents
   * 
   * Requirement 14.1: Conditional approval status
   * Requirement 14.2: Store requested_documents
   * Requirement 14.6: Create audit log entry
   * 
   * @param venueId - Venue ID for conditional approval
   * @param requestedDocuments - List of documents to request
   * @returns Updated venue information
   * @throws AdminVenueServiceError on API failure
   */
  async conditionalApproveVenue(
    venueId: string,
    requestedDocuments: string[]
  ): Promise<AdminVenue> {
    try {
      // Client-side validation
      if (!requestedDocuments || requestedDocuments.length === 0) {
        throw new AdminVenueServiceError(
          'At least one document must be requested for conditional approval.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'requested_documents', minLength: 1 },
          false
        );
      }

      const payload: VenueConditionalApprovalRequest = {
        venue_id: venueId,
        requested_documents: requestedDocuments,
      };

      const response = await api.patch<AdminVenue>(
        `${ADMIN_VENUE_API_BASE}/${venueId}/conditional-approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.conditionalApproveVenue error:', error);
      
      if (error instanceof AdminVenueServiceError) {
        throw error;
      }
      
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve multiple venues at once
   * 
   * Requirement 5.5: Bulk approve endpoint
   * Requirement 11.2: Bulk operations with max 50 items
   * Requirement 19.2: Limit bulk operations to 50 items per request
   * 
   * @param venueIds - Array of venue IDs to approve (max 50)
   * @returns Bulk operation result with counts
   * @throws AdminVenueServiceError on API failure
   */
  async bulkApproveVenues(venueIds: string[]): Promise<BulkOperationResult> {
    try {
      // Client-side validation
      if (!venueIds || venueIds.length === 0) {
        throw new AdminVenueServiceError(
          'At least one venue must be selected for bulk approval.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'venue_ids', minLength: 1 },
          false
        );
      }

      if (venueIds.length > 50) {
        throw new AdminVenueServiceError(
          'Bulk operations are limited to 50 items per request.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'venue_ids', maxLength: 50 },
          false
        );
      }

      const payload: VenueBulkApprovalRequest = {
        venue_ids: venueIds,
      };

      const response = await api.post<BulkOperationResult>(
        `${ADMIN_VENUE_API_BASE}/bulk-approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.bulkApproveVenues error:', error);
      
      if (error instanceof AdminVenueServiceError) {
        throw error;
      }
      
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject multiple venues with a single reason
   * 
   * Requirement 5.6: Bulk reject endpoint
   * Requirement 11.3: Bulk operations with detailed error reporting
   * Requirement 19.2: Limit bulk operations to 50 items per request
   * 
   * @param venueIds - Array of venue IDs to reject (max 50)
   * @param rejectionReason - Reason for rejection (applies to all venues)
   * @returns Bulk operation result with counts
   * @throws AdminVenueServiceError on API failure
   */
  async bulkRejectVenues(
    venueIds: string[],
    rejectionReason: string
  ): Promise<BulkOperationResult> {
    try {
      // Client-side validation
      if (!venueIds || venueIds.length === 0) {
        throw new AdminVenueServiceError(
          'At least one venue must be selected for bulk rejection.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'venue_ids', minLength: 1 },
          false
        );
      }

      if (venueIds.length > 50) {
        throw new AdminVenueServiceError(
          'Bulk operations are limited to 50 items per request.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'venue_ids', maxLength: 50 },
          false
        );
      }

      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminVenueServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminVenueErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: VenueBulkRejectionRequest = {
        venue_ids: venueIds,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.post<BulkOperationResult>(
        `${ADMIN_VENUE_API_BASE}/bulk-reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.bulkRejectVenues error:', error);
      
      if (error instanceof AdminVenueServiceError) {
        throw error;
      }
      
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get aggregated venue statistics for dashboard
   * 
   * Requirement 5.7: Statistics endpoint
   * Requirement 20.5: Implement 60-second caching
   * 
   * @returns Venue statistics including counts by status and sport_type
   * @throws AdminVenueServiceError on API failure
   */
  async getVenueStats(): Promise<VenueStats> {
    try {
      console.log('[AdminVenueService] Fetching venue stats from:', `${ADMIN_VENUE_API_BASE}/stats/`);
      const response = await api.get<VenueStats>(`${ADMIN_VENUE_API_BASE}/stats/`);
      console.log('[AdminVenueService] Venue stats response:', response.data);
      console.log('[AdminVenueService] Venue stats field values:', {
        total: response.data.total,
        pending: response.data.pending,
        approved: response.data.approved,
        rejected: response.data.rejected,
        conditional_approvals: response.data.conditional_approvals
      });
      return response.data;
    } catch (error: any) {
      console.error('AdminVenueService.getVenueStats error:', error);
      throw AdminVenueServiceError.fromAxiosError(error);
    }
  }
}

// Export singleton instance
export const adminVenueService = new AdminVenueService();

// Export class for testing purposes
export default adminVenueService;
