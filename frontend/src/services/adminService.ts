/**
 * Admin Service
 * 
 * Service layer for admin user management and approval workflow.
 * Provides methods for user listing, filtering, approval, rejection, and statistics.
 * 
 * Requirements:
 * - 2.1, 3.1, 4.1, 5.1, 6.1: API endpoint integration
 * - 15.7, 15.8: Bulk operations support
 * - 20.1, 20.2, 20.7: Error handling
 */

import api from './api';
import type {
  AdminUser,
  UserFilters,
  UserStats,
  PaginatedUsers,
  RejectionRequest,
  BulkApprovalRequest,
  BulkRejectionRequest,
  BulkOperationResponse,
} from '@/types/admin.types';

/**
 * Error types for categorizing admin service errors
 * Requirement 20.2: Distinguish between error types
 */
export enum AdminErrorType {
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  AUTHENTICATION = 'AUTHENTICATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for admin service operations
 * Requirement 20.1, 20.2: Structured error handling with error types
 * Requirement 20.3, 20.4: Network and validation error handling
 * Requirement 20.7: Descriptive error messages
 */
export class AdminServiceError extends Error {
  statusCode?: number;
  details?: any;
  type: AdminErrorType;
  isRetryable: boolean;

  constructor(
    message: string,
    type: AdminErrorType = AdminErrorType.UNKNOWN,
    statusCode?: number,
    details?: any,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AdminServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isRetryable = isRetryable;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdminServiceError);
    }
  }

  /**
   * Create error from axios error response
   * Automatically categorizes error type based on status code
   */
  static fromAxiosError(error: any): AdminServiceError {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    const errorMessage = responseData?.error || responseData?.message || error.message;

    // Network errors (no response)
    if (!error.response) {
      return new AdminServiceError(
        'Network error. Please check your internet connection and try again.',
        AdminErrorType.NETWORK,
        undefined,
        error,
        true // Network errors are retryable
      );
    }

    // Categorize by status code
    switch (statusCode) {
      case 400:
        return new AdminServiceError(
          errorMessage || 'Invalid request. Please check your input.',
          AdminErrorType.VALIDATION,
          400,
          responseData,
          false
        );

      case 401:
        return new AdminServiceError(
          'Authentication required. Please log in.',
          AdminErrorType.AUTHENTICATION,
          401,
          responseData,
          false
        );

      case 403:
        return new AdminServiceError(
          errorMessage || 'You do not have permission to perform this action. Admin access required.',
          AdminErrorType.PERMISSION,
          403,
          responseData,
          false
        );

      case 404:
        return new AdminServiceError(
          errorMessage || 'The requested resource was not found.',
          AdminErrorType.NOT_FOUND,
          404,
          responseData,
          false
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new AdminServiceError(
          'Server error. Please try again later.',
          AdminErrorType.SERVER,
          statusCode,
          responseData,
          true // Server errors are retryable
        );

      default:
        return new AdminServiceError(
          errorMessage || 'An unexpected error occurred. Please try again.',
          AdminErrorType.UNKNOWN,
          statusCode,
          responseData,
          true
        );
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if error is a specific type
   */
  isType(type: AdminErrorType): boolean {
    return this.type === type;
  }
}

/**
 * Base URL for admin API endpoints
 */
const ADMIN_API_BASE = '/api/accounts/admin/users';

/**
 * Admin Service
 * Provides methods for admin user management operations
 */
class AdminService {
  /**
   * Get paginated list of users with optional filtering
   * 
   * Requirement 2.1: User listing endpoint
   * Requirement 2.3-2.6: Filtering support
   * 
   * @param filters - Optional filters for role, status, date range, search
   * @returns Paginated list of users
   * @throws AdminServiceError on API failure
   */
  async getUsers(filters?: UserFilters): Promise<PaginatedUsers> {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query parameters
      if (filters?.role) {
        params.append('role', filters.role);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.registration_date_from) {
        params.append('registration_date_from', filters.registration_date_from);
      }
      if (filters?.registration_date_to) {
        params.append('registration_date_to', filters.registration_date_to);
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
      const url = queryString ? `${ADMIN_API_BASE}/?${queryString}` : `${ADMIN_API_BASE}/`;
      
      const response = await api.get<PaginatedUsers>(url);
      return response.data;
    } catch (error: any) {
      console.error('AdminService.getUsers error:', error);
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get detailed information for a specific user
   * 
   * Requirement 3.1: User detail endpoint
   * Requirement 3.3-3.5: Complete profile with approval history
   * 
   * @param userId - User ID to retrieve
   * @returns Detailed user information
   * @throws AdminServiceError on API failure
   */
  async getUserDetail(userId: string): Promise<AdminUser> {
    try {
      const response = await api.get<AdminUser>(`${ADMIN_API_BASE}/${userId}/`);
      return response.data;
    } catch (error: any) {
      console.error('AdminService.getUserDetail error:', error);
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Get aggregated user statistics for dashboard
   * 
   * Requirement 6.1: Statistics endpoint
   * Requirement 6.3-6.7: Aggregated metrics
   * 
   * @returns User statistics including counts by status and role
   * @throws AdminServiceError on API failure
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await api.get<UserStats>(`${ADMIN_API_BASE}/stats/`);
      return response.data;
    } catch (error: any) {
      console.error('AdminService.getUserStats error:', error);
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve a pending user registration
   * 
   * Requirement 4.1: Approval endpoint
   * Requirement 4.3-4.8: Status update, audit logging, notifications
   * 
   * @param userId - User ID to approve
   * @returns Updated user information
   * @throws AdminServiceError on API failure
   */
  async approveUser(userId: string): Promise<AdminUser> {
    try {
      const response = await api.patch<AdminUser>(`${ADMIN_API_BASE}/${userId}/approve/`);
      return response.data;
    } catch (error: any) {
      console.error('AdminService.approveUser error:', error);
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject a user registration with reason
   * 
   * Requirement 5.1: Rejection endpoint
   * Requirement 5.3-5.9: Reason validation, status update, notifications
   * 
   * @param userId - User ID to reject
   * @param rejectionReason - Reason for rejection (minimum 10 characters)
   * @returns Updated user information
   * @throws AdminServiceError on API failure
   */
  async rejectUser(userId: string, rejectionReason: string): Promise<AdminUser> {
    try {
      // Client-side validation for rejection reason
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: RejectionRequest = {
        user_id: userId,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.patch<AdminUser>(
        `${ADMIN_API_BASE}/${userId}/reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminService.rejectUser error:', error);
      
      // Re-throw AdminServiceError instances
      if (error instanceof AdminServiceError) {
        throw error;
      }
      
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Approve multiple users at once
   * 
   * Requirement 15.7: Bulk approve endpoint
   * Requirement 15.1-15.5: Bulk operations support
   * 
   * @param userIds - Array of user IDs to approve
   * @returns Bulk operation result with counts
   * @throws AdminServiceError on API failure
   */
  async bulkApprove(userIds: string[]): Promise<BulkOperationResponse> {
    try {
      // Client-side validation
      if (!userIds || userIds.length === 0) {
        throw new AdminServiceError(
          'At least one user must be selected for bulk approval.',
          AdminErrorType.VALIDATION,
          400,
          { field: 'user_ids', minLength: 1 },
          false
        );
      }

      const payload: BulkApprovalRequest = {
        user_ids: userIds,
      };

      const response = await api.post<BulkOperationResponse>(
        `${ADMIN_API_BASE}/bulk-approve/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminService.bulkApprove error:', error);
      
      // Re-throw AdminServiceError instances
      if (error instanceof AdminServiceError) {
        throw error;
      }
      
      throw AdminServiceError.fromAxiosError(error);
    }
  }

  /**
   * Reject multiple users with a single reason
   * 
   * Requirement 15.8: Bulk reject endpoint
   * Requirement 15.1-15.6: Bulk operations support
   * 
   * @param userIds - Array of user IDs to reject
   * @param rejectionReason - Reason for rejection (applies to all users)
   * @returns Bulk operation result with counts
   * @throws AdminServiceError on API failure
   */
  async bulkReject(userIds: string[], rejectionReason: string): Promise<BulkOperationResponse> {
    try {
      // Client-side validation
      if (!userIds || userIds.length === 0) {
        throw new AdminServiceError(
          'At least one user must be selected for bulk rejection.',
          AdminErrorType.VALIDATION,
          400,
          { field: 'user_ids', minLength: 1 },
          false
        );
      }

      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new AdminServiceError(
          'Rejection reason must be at least 10 characters.',
          AdminErrorType.VALIDATION,
          400,
          { field: 'rejection_reason', minLength: 10 },
          false
        );
      }

      const payload: BulkRejectionRequest = {
        user_ids: userIds,
        rejection_reason: rejectionReason.trim(),
      };

      const response = await api.post<BulkOperationResponse>(
        `${ADMIN_API_BASE}/bulk-reject/`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('AdminService.bulkReject error:', error);
      
      // Re-throw AdminServiceError instances
      if (error instanceof AdminServiceError) {
        throw error;
      }
      
      throw AdminServiceError.fromAxiosError(error);
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();

// Export class for testing purposes
export default adminService;
