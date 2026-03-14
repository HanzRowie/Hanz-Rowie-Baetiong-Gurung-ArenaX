/**
 * Tournament and Venue Verification System Type Definitions
 * 
 * Type definitions for the admin tournament and venue approval workflow system.
 * These types align with the backend API serializers and WebSocket message formats.
 */

/**
 * Approval status enum for tournaments and venues
 * Requirement 3.1, 3.2: Database schema extensions
 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONDITIONAL_APPROVAL';

/**
 * Sport type enum
 */
export type SportType = 'FUTSAL' | 'BASKETBALL' | 'BADMINTON' | 'VOLLEYBALL';

/**
 * Validation severity levels
 * Requirement 12.6, 13.6: Validation result display
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Document types for verification
 * Requirement 10.5: Document metadata display
 */
export type DocumentType = 
  | 'business_license'
  | 'facility_photos'
  | 'insurance_certificate'
  | 'operating_permit'
  | 'payment_verification'
  | 'other';

/**
 * Audit action types for tournaments and venues
 * Requirement 3.3, 3.4: Audit log models
 */
export type AuditActionType = 
  | 'APPROVE'
  | 'REJECT'
  | 'CONDITIONAL_APPROVE'
  | 'BULK_APPROVE'
  | 'BULK_REJECT'
  | 'VIEW_DOCUMENT'
  | 'REQUEST_DOCUMENTS';

// ============================================================================
// Tournament Types
// ============================================================================

/**
 * Verification document interface
 * Requirement 10.5: Document metadata
 */
export interface VerificationDocument {
  document_type: DocumentType;
  file_url: string;
  upload_date: string;
  file_size: number;
  file_name?: string;
}

/**
 * Tournament validation result interface
 * Requirement 8.3, 12.6: Validation results display
 */
export interface TournamentValidationResult {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code?: string;
}

/**
 * Tournament audit log entry interface
 * Requirement 8.3, 3.3: Audit log tracking
 */
export interface TournamentAuditLog {
  id: string;
  administrator_name: string;
  action_type: AuditActionType;
  previous_status?: ApprovalStatus;
  new_status?: ApprovalStatus;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Admin tournament interface with approval fields
 * Requirement 8.1, 8.2: Tournament management page
 */
export interface AdminTournament {
  id: string;
  title: string;
  sport_type: SportType;
  date: string;
  venue: string;
  organizer_id: string;
  organizer_name: string;
  organizer_email: string;
  approval_status: ApprovalStatus;
  approval_date?: string;
  approved_by_name?: string;
  rejection_reason?: string;
  approval_notes?: string;
  verification_documents: VerificationDocument[];
  requested_documents: string[];
  prize_pool?: number;
  max_teams: number;
  registration_deadline: string;
  created_at: string;
  updated_at: string;
  linked_venue_id?: string;
  linked_venue_status?: ApprovalStatus;
  validation_results?: TournamentValidationResult[];
  audit_logs?: TournamentAuditLog[];
}

/**
 * Simplified tournament interface for list views
 * Requirement 8.3: Tournament table display
 */
export interface TournamentListItem {
  id: string;
  title: string;
  sport_type: SportType;
  organizer_name: string;
  submission_date: string;
  approval_status: ApprovalStatus;
  date: string;
  venue: string;
}

/**
 * Tournament filters interface for API queries
 * Requirement 8.2, 4.1: Filtering support
 */
export interface TournamentFilters {
  sport_type?: SportType;
  status?: ApprovalStatus;
  organizer?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Tournament statistics interface
 * Requirement 8.1, 4.7: Statistics display
 */
export interface TournamentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  conditional_approval: number;
}

// ============================================================================
// Venue Types
// ============================================================================

/**
 * Venue validation result interface
 * Requirement 9.3, 13.6: Validation results display
 */
export interface VenueValidationResult {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code?: string;
}

/**
 * Venue audit log entry interface
 * Requirement 9.3, 3.4: Audit log tracking
 */
export interface VenueAuditLog {
  id: string;
  administrator_name: string;
  action_type: AuditActionType;
  previous_status?: ApprovalStatus;
  new_status?: ApprovalStatus;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Operating hours interface
 */
export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    is_closed?: boolean;
  };
}

/**
 * Pricing information interface
 */
export interface VenuePricing {
  hourly_rate: number;
  currency: string;
  deposit_required?: number;
  cancellation_policy?: string;
}

/**
 * Admin venue interface with approval fields
 * Requirement 9.1, 9.2: Venue management page
 */
export interface AdminVenue {
  id: string;
  name: string;
  sport_types: string[];
  location: string;
  latitude?: string;
  longitude?: string;
  address?: string; // Alias for location
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_details?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    approval_status: string;
  };
  approval_status: ApprovalStatus;
  approval_date?: string;
  approved_by_name?: string;
  rejection_reason?: string;
  approval_notes?: string;
  verification_documents: VerificationDocument[];
  requested_documents: string[];
  capacity?: number;
  price_per_hour?: number;
  court_size?: string;
  facilities?: string;
  image?: string;
  is_active?: boolean;
  default_opening_time?: string;
  default_closing_time?: string;
  operating_days?: number[];
  created_at: string;
  updated_at: string;
  validation_results?: VenueValidationResult[];
  audit_logs?: VenueAuditLog[];
}

/**
 * Simplified venue interface for list views
 * Requirement 9.3: Venue table display
 */
export interface VenueListItem {
  id: string;
  name: string;
  sport_type: SportType;
  owner_name: string;
  submission_date: string;
  approval_status: ApprovalStatus;
  address: string;
}

/**
 * Venue filters interface for API queries
 * Requirement 9.2, 5.1: Filtering support
 */
export interface VenueFilters {
  sport_type?: SportType;
  status?: ApprovalStatus;
  owner?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Venue statistics interface
 * Requirement 9.1, 5.7: Statistics display
 */
export interface VenueStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  conditional_approval: number;
}

// ============================================================================
// Shared Types
// ============================================================================

/**
 * Bulk operation result interface
 * Requirement 11.4, 11.5: Bulk operations feedback
 */
export interface BulkOperationResult {
  success: boolean;
  success_count: number;
  failure_count: number;
  total_requested: number;
  failed_items?: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Paginated tournaments response interface
 */
export interface PaginatedTournaments {
  count: number;
  next: string | null;
  previous: string | null;
  results: TournamentListItem[];
}

/**
 * Paginated venues response interface
 */
export interface PaginatedVenues {
  count: number;
  next: string | null;
  previous: string | null;
  results: VenueListItem[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Tournament approval request payload
 * Requirement 4.3: Approve endpoint
 */
export interface TournamentApprovalRequest {
  tournament_id: string;
  approval_notes?: string;
}

/**
 * Tournament rejection request payload
 * Requirement 4.4: Reject endpoint
 */
export interface TournamentRejectionRequest {
  tournament_id: string;
  rejection_reason: string;
}

/**
 * Tournament conditional approval request payload
 * Requirement 14.2: Conditional approval workflow
 */
export interface TournamentConditionalApprovalRequest {
  tournament_id: string;
  requested_documents: string[];
}

/**
 * Tournament bulk approval request payload
 * Requirement 4.5: Bulk approve endpoint
 */
export interface TournamentBulkApprovalRequest {
  tournament_ids: string[];
}

/**
 * Tournament bulk rejection request payload
 * Requirement 4.6: Bulk reject endpoint
 */
export interface TournamentBulkRejectionRequest {
  tournament_ids: string[];
  rejection_reason: string;
}

/**
 * Venue approval request payload
 * Requirement 5.3: Approve endpoint
 */
export interface VenueApprovalRequest {
  venue_id: string;
  approval_notes?: string;
}

/**
 * Venue rejection request payload
 * Requirement 5.4: Reject endpoint
 */
export interface VenueRejectionRequest {
  venue_id: string;
  rejection_reason: string;
}

/**
 * Venue conditional approval request payload
 * Requirement 14.2: Conditional approval workflow
 */
export interface VenueConditionalApprovalRequest {
  venue_id: string;
  requested_documents: string[];
}

/**
 * Venue bulk approval request payload
 * Requirement 5.5: Bulk approve endpoint
 */
export interface VenueBulkApprovalRequest {
  venue_ids: string[];
}

/**
 * Venue bulk rejection request payload
 * Requirement 5.6: Bulk reject endpoint
 */
export interface VenueBulkRejectionRequest {
  venue_ids: string[];
  rejection_reason: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket message types for verification system
 * Requirement 7.1, 7.2, 7.3, 7.4: Real-time updates
 */
export type VerificationWebSocketMessageType = 
  | 'tournament_submitted'
  | 'venue_submitted'
  | 'tournament_status_changed'
  | 'venue_status_changed'
  | 'documents_uploaded';

/**
 * Base verification WebSocket message interface
 */
export interface VerificationWebSocketMessage {
  type: VerificationWebSocketMessageType;
  [key: string]: any;
}

/**
 * Tournament submitted WebSocket message
 * Requirement 7.1: Admin notification on tournament submission
 */
export interface TournamentSubmittedMessage extends VerificationWebSocketMessage {
  type: 'tournament_submitted';
  resource_type: 'tournament';
  resource_id: string;
  tournament_title: string;
  organizer_name: string;
  sport_type: SportType;
  new_status: ApprovalStatus;
  timestamp: string;
}

/**
 * Venue submitted WebSocket message
 * Requirement 7.2: Admin notification on venue submission
 */
export interface VenueSubmittedMessage extends VerificationWebSocketMessage {
  type: 'venue_submitted';
  resource_type: 'venue';
  resource_id: string;
  venue_name: string;
  owner_name: string;
  sport_type: SportType;
  new_status: ApprovalStatus;
  timestamp: string;
}

/**
 * Tournament status changed WebSocket message
 * Requirement 7.3: Organizer notification on status change
 */
export interface TournamentStatusChangedMessage extends VerificationWebSocketMessage {
  type: 'tournament_status_changed';
  resource_type: 'tournament';
  resource_id: string;
  tournament_title: string;
  new_status: ApprovalStatus;
  approval_date?: string;
  rejection_reason?: string;
  requested_documents?: string[];
  timestamp: string;
}

/**
 * Venue status changed WebSocket message
 * Requirement 7.4: Owner notification on status change
 */
export interface VenueStatusChangedMessage extends VerificationWebSocketMessage {
  type: 'venue_status_changed';
  resource_type: 'venue';
  resource_id: string;
  venue_name: string;
  new_status: ApprovalStatus;
  approval_date?: string;
  rejection_reason?: string;
  requested_documents?: string[];
  timestamp: string;
}

/**
 * Documents uploaded WebSocket message
 * Requirement 14.4: Admin notification on document upload
 */
export interface DocumentsUploadedMessage extends VerificationWebSocketMessage {
  type: 'documents_uploaded';
  resource_type: 'tournament' | 'venue';
  resource_id: string;
  resource_name: string;
  uploaded_documents: string[];
  timestamp: string;
}

/**
 * Union type for all verification WebSocket messages
 */
export type VerificationWebSocketMessageUnion = 
  | TournamentSubmittedMessage
  | VenueSubmittedMessage
  | TournamentStatusChangedMessage
  | VenueStatusChangedMessage
  | DocumentsUploadedMessage;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Verification API error response interface
 */
export interface VerificationApiError {
  error: string;
  detail?: string;
  field_errors?: Record<string, string[]>;
}

/**
 * Verification service error class
 */
export class VerificationServiceError extends Error {
  statusCode?: number;
  details?: any;

  constructor(message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'VerificationServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================================================
// Search and Discovery Types
// ============================================================================

/**
 * Search operator types
 * Requirement 18.3: Search operators support
 */
export type SearchOperator = 'exact' | 'exclude' | 'or' | 'default';

/**
 * Parsed search term interface
 */
export interface ParsedSearchTerm {
  term: string;
  operator: SearchOperator;
}

/**
 * Search suggestion interface
 * Requirement 18.5: Search suggestions
 */
export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'autocomplete';
  count?: number;
}

// ============================================================================
// Audit and Reporting Types
// ============================================================================

/**
 * Audit log filters interface
 * Requirement 17.2: Audit log filtering
 */
export interface AuditLogFilters {
  admin_id?: string;
  action_type?: AuditActionType;
  resource_type?: 'tournament' | 'venue';
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Audit metrics interface
 * Requirement 17.4, 17.5: Reporting metrics
 */
export interface AuditMetrics {
  average_approval_time_hours: number;
  rejection_rate_by_admin: Record<string, number>;
  approval_rate_by_sport: Record<SportType, number>;
  organizers_with_multiple_rejections: Array<{
    organizer_id: string;
    organizer_name: string;
    rejection_count: number;
  }>;
  owners_with_multiple_rejections: Array<{
    owner_id: string;
    owner_name: string;
    rejection_count: number;
  }>;
}

/**
 * Export format types
 * Requirement 24.1, 24.2: Data export
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export request interface
 */
export interface ExportRequest {
  format: ExportFormat;
  filters?: TournamentFilters | VenueFilters;
  include_audit_logs?: boolean;
}
