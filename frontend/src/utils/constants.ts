// API Configuration
export const API_URL = import.meta.env.VITE_API_URL;
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
    REGISTER: '/api/auth/register/',
    LOGIN: '/api/auth/login/',
    LOGOUT: '/api/auth/logout/',
    REFRESH: '/api/auth/refresh/',
    VERIFY_EMAIL: '/api/auth/verify-email/',
    RESEND_VERIFICATION: '/api/auth/resend-verification/',
    PASSWORD_RESET_REQUEST: '/api/auth/forgot-password/',
    PASSWORD_RESET_CONFIRM: '/api/auth/reset-password/',
    CHANGE_PASSWORD: '/api/auth/change-password/',
    SESSIONS: '/api/auth/sessions/',
  },
  USERS: {
    ME: '/api/users/me/',
    PROFILE_PICTURE: '/api/users/me/profile-picture/',
    SEARCH: '/api/users/search/',
    BY_ID: (id: string) => `/api/users/${id}/`,
    SESSION: (id: string) => `/api/auth/sessions/${id}/`,
  },
  TOURNAMENTS: {
    LIST: '/api/tournaments/',
    CREATE: '/api/tournaments/create/',
    MY: '/api/tournaments/my/',
    BY_ID: (id: string) => `/api/tournaments/${id}/`,
    REGISTER: (id: string) => `/api/tournaments/${id}/register/`,
    WITHDRAW: (id: string) => `/api/tournaments/${id}/withdraw/`,
    GENERATE_BRACKET: (id: string) => `/api/tournaments/${id}/generate-bracket/`,
    BRACKET: (id: string) => `/api/tournaments/${id}/bracket/`,
    MATCH_RESULT: (tournamentId: string, matchId: string) => `/api/tournaments/${tournamentId}/matches/${matchId}/result/`,
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats/',
    MONTHLY_STATS: '/api/dashboard/monthly-stats/',
    NEXT_TOURNAMENT: '/api/dashboard/next-tournament/',
    PROFILE: '/api/dashboard/profile/',
    UPDATE_STATS: '/api/dashboard/update-stats/',
    NOTIFICATIONS: '/api/dashboard/notifications/',
    LAYOUT: '/api/dashboard/layout',
    PREFERENCES: '/api/dashboard/preferences',
  },
  VENUES: {
    LIST: '/api/venues/',
    MY: '/api/my-venues/',
    CREATE: '/api/venues/create',
    BY_ID: (id: string) => `/api/venues/${id}`,
    BOOKINGS: '/api/my-bookings/',
  },
  CHAT: {
    CONVERSATIONS: '/api/conversations/',
    MESSAGES: (userId: string) => `/api/conversations/${userId}/`,
    SEND: '/api/messages/send',
    UNREAD_COUNT: '/api/messages/unread-count',
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
