/**
 * Breakpoint Design Tokens
 * Responsive design breakpoints and media queries
 */

// Breakpoint values
export const breakpoints = {
  xs: '320px',   // Extra small devices
  sm: '640px',   // Small devices (phones)
  md: '768px',   // Medium devices (tablets)
  lg: '1024px',  // Large devices (laptops)
  xl: '1280px',  // Extra large devices (desktops)
  '2xl': '1536px', // 2X large devices (large desktops)
} as const;

// Media query helpers
export const mediaQueries = {
  // Min-width queries (mobile-first)
  up: {
    xs: `@media (min-width: ${breakpoints.xs})`,
    sm: `@media (min-width: ${breakpoints.sm})`,
    md: `@media (min-width: ${breakpoints.md})`,
    lg: `@media (min-width: ${breakpoints.lg})`,
    xl: `@media (min-width: ${breakpoints.xl})`,
    '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  },
  
  // Max-width queries (desktop-first)
  down: {
    xs: `@media (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
    sm: `@media (max-width: ${parseInt(breakpoints.md) - 1}px)`,
    md: `@media (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
    lg: `@media (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
    xl: `@media (max-width: ${parseInt(breakpoints['2xl']) - 1}px)`,
  },
  
  // Range queries (between breakpoints)
  between: {
    'xs-sm': `@media (min-width: ${breakpoints.xs}) and (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
    'sm-md': `@media (min-width: ${breakpoints.sm}) and (max-width: ${parseInt(breakpoints.md) - 1}px)`,
    'md-lg': `@media (min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
    'lg-xl': `@media (min-width: ${breakpoints.lg}) and (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
    'xl-2xl': `@media (min-width: ${breakpoints.xl}) and (max-width: ${parseInt(breakpoints['2xl']) - 1}px)`,
  },
  
  // Special media queries
  touch: '@media (hover: none) and (pointer: coarse)',
  hover: '@media (hover: hover) and (pointer: fine)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',
  highContrast: '@media (prefers-contrast: high)',
  print: '@media print',
} as const;

// Container max-widths for each breakpoint
export const containerMaxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid columns for each breakpoint
export const gridColumns = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
  '2xl': 8,
} as const;

// Responsive utilities
export const responsiveUtils = {
  // Hide/show at breakpoints
  hidden: {
    xs: 'hidden xs:block',
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
    '2xl': 'hidden 2xl:block',
  },
  
  // Show only at specific breakpoint
  only: {
    xs: 'block xs:hidden',
    sm: 'hidden xs:block sm:hidden',
    md: 'hidden sm:block md:hidden',
    lg: 'hidden md:block lg:hidden',
    xl: 'hidden lg:block xl:hidden',
    '2xl': 'hidden xl:block',
  },
} as const;

// Export all breakpoint tokens
export const responsive = {
  breakpoints,
  mediaQueries,
  containerMaxWidths,
  gridColumns,
  utils: responsiveUtils,
} as const;

export type Breakpoint = keyof typeof breakpoints;
export type MediaQuery = keyof typeof mediaQueries.up;