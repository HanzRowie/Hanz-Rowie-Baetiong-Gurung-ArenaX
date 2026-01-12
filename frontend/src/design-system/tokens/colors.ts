/**
 * Color Design Tokens
 * Comprehensive color system with role-specific palettes and semantic tokens
 */

// Base color palette
export const baseColors = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  current: 'currentColor',
} as const;

// Gray scale
export const grayColors = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
  950: '#030712',
} as const;

// Primary brand colors
export const primaryColors = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
  950: '#082f49',
} as const;

// Role-specific color palettes
export const roleColors = {
  player: {
    primary: '#10b981',    // Emerald for growth/achievement
    secondary: '#34d399',
    accent: '#6ee7b7',
    light: '#d1fae5',
    dark: '#047857',
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  organizer: {
    primary: '#8b5cf6',    // Purple for leadership
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    light: '#f3e8ff',
    dark: '#7c3aed',
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  venue_owner: {
    primary: '#ef4444',    // Red for business
    secondary: '#f87171',
    accent: '#fca5a5',
    light: '#fee2e2',
    dark: '#dc2626',
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
} as const;

// Semantic colors
export const semanticColors = {
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
} as const;

// Surface colors for backgrounds and cards
export const surfaceColors = {
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  card: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    elevated: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.1)',
  },
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.3)',
    heavy: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

// Text colors
export const textColors = {
  primary: '#111827',
  secondary: '#6b7280',
  tertiary: '#9ca3af',
  inverse: '#ffffff',
  disabled: '#d1d5db',
} as const;

// Border colors
export const borderColors = {
  primary: '#e5e7eb',
  secondary: '#d1d5db',
  tertiary: '#9ca3af',
  focus: '#3b82f6',
  error: '#ef4444',
  success: '#10b981',
} as const;

// Export all colors as a single object
export const colors = {
  ...baseColors,
  gray: grayColors,
  primary: primaryColors,
  role: roleColors,
  semantic: semanticColors,
  surface: surfaceColors,
  text: textColors,
  border: borderColors,
} as const;

export type ColorToken = keyof typeof colors;
export type RoleType = keyof typeof roleColors;