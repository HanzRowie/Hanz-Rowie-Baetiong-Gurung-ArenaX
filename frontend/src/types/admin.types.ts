/**
 * Admin Control System Type Definitions
 * 
 * Type definitions for the admin user management and approval workflow system.
 * These types align with the backend API serializers and WebSocket message formats.
 */

/**
 * User approval status enum
 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * User role enum
 */
export type UserRole = 'PLAYER' | 'ORGANIZER' | 'REFEREE' | 'VENUE_OWNER' | 'ADMIN';

/**
 * Admin audit log action types
 */
export type AuditActionType = 
  | 'APPROVE' 
  | 'REJECT' 
  | 'BULK_APPROVE' 
  | 'BULK_REJECT' 
  | 'VIEW_DOCUMENT';

/**
 * User interface with all fields for admin management
 * Corresponds to AdminUserDetailSerializer
 */
export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  approval_date?: string;
  approved_by_name?: string;
  rejection_reason?: string;
  verification_document_url?: string;
  bio?: string;
  date_of_birth?: string;
  location?: string;
  country?: string;
  business_name?: string;
  business_registration?: string;
  created_at: string;
  updated_at: string;
  recent_audit_logs?: AuditLog[];
}

/**
 * Simplified user interface for list views
 * Corresponds to AdminUserListSerializer
 */
export interface UserListItem {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  created_at: string;
  verification_document_url?: string;
}

/**
 * Audit log entry interface
 * Corresponds to AuditLogSerializer
 */
export interface AuditLog {
  id: string;
  action_type: AuditActionType;
  administrator_name: string;
  rejection_reason?: string;
  timestamp: string;
}

/**
 * User filters interface for API queries
 * Used for filtering and searching users
 */
export interface UserFilters {
  role?: UserRole;
  status?: ApprovalStatus;
  registration_date_from?: string;
  registration_date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * User statistics interface for dashboard
 * Corresponds to stats endpoint response
 * Requirement 6.3: Statistics aggregation
 */
export interface UserStats {
  total_users: number;
  pending_approvals: number;
  approved_today: number;
  rejected_total: number;
  by_role: {
    [role in UserRole]?: {
      PENDING: number;
      APPROVED: number;
      REJECTED: number;
    };
  };
}

/**
 * Paginated users response interface
 * Standard DRF pagination format
 */
export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserListItem[];
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'connection_established'
  | 'new_user_registration'
  | 'user_approved'
  | 'user_rejected';

/**
 * Base WebSocket message interface
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

/**
 * Connection established message
 */
export interface ConnectionEstablishedMessage extends WebSocketMessage {
  type: 'connection_established';
  message: string;
}

/**
 * New user registration WebSocket message
 * Requirement 12.1: Real-time dashboard updates
 */
export interface NewUserRegistrationMessage extends WebSocketMessage {
  type: 'new_user_registration';
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  timestamp: string;
}

/**
 * User approved WebSocket message
 * Requirement 12.3: Real-time approval updates
 */
export interface UserApprovedMessage extends WebSocketMessage {
  type: 'user_approved';
  user_id: string;
  user_name: string;
  approved_by: string;
}

/**
 * User rejected WebSocket message
 * Requirement 12.4: Real-time rejection updates
 */
export interface UserRejectedMessage extends WebSocketMessage {
  type: 'user_rejected';
  user_id: string;
  user_name: string;
  rejected_by: string;
}

/**
 * Union type for all WebSocket messages
 */
export type AdminWebSocketMessage = 
  | ConnectionEstablishedMessage
  | NewUserRegistrationMessage
  | UserApprovedMessage
  | UserRejectedMessage;

/**
 * Approval request payload
 */
export interface ApprovalRequest {
  user_id: string;
}

/**
 * Rejection request payload
 */
export interface RejectionRequest {
  user_id: string;
  rejection_reason: string;
}

/**
 * Bulk approval request payload
 */
export interface BulkApprovalRequest {
  user_ids: string[];
}

/**
 * Bulk rejection request payload
 */
export interface BulkRejectionRequest {
  user_ids: string[];
  rejection_reason: string;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean;
  approved_count?: number;
  rejected_count?: number;
  total_requested: number;
}

/**
 * API error response interface
 */
export interface AdminApiError {
  error: string;
  detail?: string;
  approval_status?: ApprovalStatus;
  rejection_reason?: string;
}

/**
 * WebSocket connection status
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Admin service error class type
 */
export class AdminServiceError extends Error {
  statusCode?: number;
  details?: any;

  constructor(message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'AdminServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
