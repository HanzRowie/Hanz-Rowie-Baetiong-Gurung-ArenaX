// API Configuration
export const API_URL = import.meta.env.VITE_API_URL;

/**
 * Converts a potentially relative media URL to an absolute URL.
 * The backend serializer may return relative paths (e.g. /media/...) when
 * the request context is unavailable. This ensures images always load.
 */
export const getMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (API_URL || 'http://localhost:8000').replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};
export const WS_URL = import.meta.env.VITE_WS_URL;

// Application Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME;
export const APP_VERSION = import.meta.env.VITE_APP_VERSION;

// Authentication Configuration
export const ACCESS_TOKEN_KEY = import.meta.env.VITE_ACCESS_TOKEN_KEY;
export const REFRESH_TOKEN_KEY = import.meta.env.VITE_REFRESH_TOKEN_KEY;

// Token Expiry Times (in milliseconds)
export const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Feature Flags
export const ENABLE_SOCIAL_LOGIN = import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true';
export const ENABLE_TWO_FACTOR_AUTH = import.meta.env.VITE_ENABLE_TWO_FACTOR_AUTH === 'true';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/accounts/auth/register/',
    LOGIN: '/api/accounts/auth/login/',
    LOGOUT: '/api/accounts/auth/logout/',
    REFRESH: '/api/accounts/auth/refresh/',
    VERIFY_EMAIL: '/api/accounts/auth/verify-email/',
    RESEND_VERIFICATION: '/api/accounts/auth/resend-verification/',
    PASSWORD_RESET_REQUEST: '/api/accounts/auth/forgot-password/',
    PASSWORD_RESET_CONFIRM: '/api/accounts/auth/reset-password/',
    CHANGE_PASSWORD: '/api/accounts/auth/change-password/',
    SESSIONS: '/api/accounts/auth/sessions/',
  },
  USERS: {
    ME: '/api/accounts/users/me/',
    PROFILE_UPDATE: '/api/accounts/users/profile/update/',
    PROFILE_PICTURE: '/api/accounts/users/me/profile-picture/',
    SEARCH: '/api/accounts/users/search/',
    STATISTICS: '/api/accounts/users/statistics/',
    ACTIVITY: '/api/accounts/users/activity/',
    ACHIEVEMENTS: '/api/accounts/users/achievements/',
    CONNECTIONS: '/api/accounts/users/connections/',
    RECENT_ACTIVITY: '/api/accounts/users/recent-activity/',
    BY_ID: (id: string) => `/api/accounts/users/profile/${id}`,
    SESSION: (id: string) => `/api/accounts/auth/sessions/${id}/`,
  },
  TOURNAMENTS: {
    LIST: '/api/tournaments/tournaments/',
    CREATE: '/api/tournaments/create/',
    MY: '/api/tournaments/my/',
    BY_ID: (id: string) => `/api/tournaments/tournaments/${id}/`,
    UPDATE: (id: string) => `/api/tournaments/tournaments/${id}/`,
    REGISTER: (id: string) => `/api/tournaments/${id}/register/`,
    WITHDRAW: (id: string) => `/api/tournaments/${id}/withdraw/`,
    GENERATE_BRACKET: (id: string) => `/api/tournaments/${id}/generate-bracket/`,
    GENERATE_SCHEDULE: (id: string) => `/api/tournaments/tournaments/${id}/generate_schedule/`,
    BRACKET: (id: string) => `/api/tournaments/${id}/bracket/`,
    MATCH_RESULT: (tournamentId: string, matchId: string) => `/api/tournaments/${tournamentId}/matches/${matchId}/result/`,
    PARTICIPANTS: (id: string) => `/api/tournaments/${id}/participants/`,
    ACCEPT_PARTICIPANT: (tournamentId: string, participantId: string) => `/api/tournaments/${tournamentId}/participants/${participantId}/accept/`,
    REJECT_PARTICIPANT: (tournamentId: string, participantId: string) => `/api/tournaments/${tournamentId}/participants/${participantId}/reject/`,
    BULK_ACCEPT_PARTICIPANTS: (id: string) => `/api/tournaments/${id}/participants/bulk-accept/`,
    BULK_REJECT_PARTICIPANTS: (id: string) => `/api/tournaments/${id}/participants/bulk-reject/`,
    STANDINGS: (id: string) => `/api/tournaments/tournaments/${id}/standings/`,
    TOP_SCORERS: (id: string) => `/api/tournaments/tournaments/${id}/top_scorers/`,
    TOP_ASSISTS: (id: string) => `/api/tournaments/tournaments/${id}/top_assists/`,
  },
  DASHBOARD: {
    STATS: '/api/accounts/dashboard/stats/',
    MONTHLY_STATS: '/api/accounts/dashboard/monthly-stats/',
    NEXT_TOURNAMENT: '/api/accounts/dashboard/next-tournament/',
    PROFILE: '/api/accounts/dashboard/profile/',
    UPDATE_STATS: '/api/accounts/dashboard/update-stats/',
    NOTIFICATIONS: '/api/accounts/dashboard/notifications/',
    LAYOUT: '/api/accounts/dashboard/layout',
    PREFERENCES: '/api/accounts/dashboard/preferences',
  },
  VENUES: {
    LIST: '/api/venues/venues/',
    MY: '/api/venues/my-venues/',
    CREATE: '/api/venues/create',
    BY_ID: (id: string) => `/api/venues/venues/${id}`,
    BOOKINGS: '/api/venues/my-bookings/',
  },
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations/',
    MESSAGES: (userId: string) => `/api/chat/conversations/${userId}/`,
    SEND: '/api/chat/messages/',
    UNREAD_COUNT: '/api/chat/messages/unread-count',
  },
} as const;

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ACCOUNT_PENDING_APPROVAL: '/account-pending-approval',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  SEARCH: '/search',
  USER_PROFILE: (id: string) => `/users/${id}`,
  CREATE_TOURNAMENT: '/tournaments/create',
} as const;

// User Roles
export const USER_ROLES = {
  PLAYER: 'PLAYER',
  ORGANIZER: 'ORGANIZER',
  REFEREE: 'REFEREE',
  VENUE_OWNER: 'VENUE_OWNER',
} as const;

// Sports
export const SPORTS = {
  FUTSAL: 'FUTSAL',
  BADMINTON: 'BADMINTON',
} as const;

// Skill Levels
export const SKILL_LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  PROFESSIONAL: 'PROFESSIONAL',
} as const;

// Validation Rules
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  PROFILE_PICTURE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },
  PHONE: {
    PATTERN: /^[0-9]{10}$/,
  },
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  PASSWORD_RESET_REQUESTS: 3,
  VERIFICATION_RESEND: 3,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
} as const;
