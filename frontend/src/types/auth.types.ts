// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

// User Roles
export const UserRole = {
  PLAYER: 'PLAYER',
  ORGANIZER: 'ORGANIZER',
  REFEREE: 'REFEREE',
  VENUE_OWNER: 'VENUE_OWNER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Sports
export const Sport = {
  FUTSAL: 'FUTSAL',
  BADMINTON: 'BADMINTON',
} as const;

export type Sport = typeof Sport[keyof typeof Sport];

// Skill Levels
export const SkillLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  PROFESSIONAL: 'PROFESSIONAL',
} as const;

export type SkillLevel = typeof SkillLevel[keyof typeof SkillLevel];

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

// Base User Profile
export interface UserProfile {
  bio: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  profile_completeness: number;
  is_private: boolean;
  
  // Role-specific fields (conditional based on user.role)
  // Player fields
  preferred_sports?: Sport[];
  skill_level?: SkillLevel;
  playing_position?: string;
  
  // Organizer fields
  organization_name?: string;
  organization_type?: string;
  years_experience?: number;
  
  // Referee fields
  certification_details?: string;
  referee_sports?: Sport[];
  experience_level?: string;
  hourly_rate?: number;
  
  // Venue Owner fields
  business_name?: string;
  business_registration?: string;
  business_contact?: string;
}

// User interface with profile
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  profile_picture: string | null;
  is_verified: boolean;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  country?: string;
  location?: string;
  bio?: string;
  date_of_birth?: string;
  preferred_sports?: string[];
  skill_level?: string;
  achievements?: string;
  social_links?: Record<string, string>;
  is_available_for_matches?: boolean;
  date_joined?: string;
  tournaments_participated?: number;
  matches_played?: number;
  matches_won?: number;
  win_rate?: number;
  profile?: UserProfile;
  created_at: string;
  updated_at?: string;
  last_login: string | null;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

// Login
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginRequest extends LoginCredentials {}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Registration
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
}

export interface RegisterRequest extends RegisterData {}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  };
  otp?: string; // Only in development mode
}

// Token Refresh
export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}

// Email Verification
export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  verified: boolean;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// Password Reset
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

// Password Change
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// Logout
export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface Session {
  id: string;
  device_type: string;
  ip_address: string;
  location: string | null;
  last_activity: string;
  is_current: boolean;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface TerminateSessionResponse {
  message: string;
}

// ============================================================================
// USER PROFILE API TYPES
// ============================================================================

export interface GetProfileResponse extends User {}

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  profile?: Partial<UserProfile>;
}

export interface UpdateProfileResponse extends User {}

export interface UploadProfilePictureResponse {
  profile_picture: string;
}

// ============================================================================
// USER SEARCH TYPES
// ============================================================================

export interface SearchUsersParams {
  q?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
}

export interface SearchUserResult {
  id: string;
  full_name: string;
  role: UserRole;
  profile_picture: string | null;
  profile_completeness: number;
}

export interface SearchUsersResponse {
  results: SearchUserResult[];
  total: number;
  page: number;
  pages: number;
}

export interface GetUserByIdResponse extends User {}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // Field-specific validation errors
    timestamp: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ============================================================================
// REDUX STATE TYPES
// ============================================================================

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
