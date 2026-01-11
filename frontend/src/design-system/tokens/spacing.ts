/**
 * Spacing Design Tokens
 * 4px base grid system with consistent margins and padding
 */

// Base spacing scale (4px grid)
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',    // 0.5 * 4px
  1: '4px',      // 1 * 4px
  1.5: '6px',    // 1.5 * 4px
  2: '8px',      // 2 * 4px
  2.5: '10px',   // 2.5 * 4px
  3: '12px',     // 3 * 4px
  3.5: '14px',   // 3.5 * 4px
  4: '16px',     // 4 * 4px
  5: '20px',     // 5 * 4px
  6: '24px',     // 6 * 4px
  7: '28px',     // 7 * 4px
  8: '32px',     // 8 * 4px
  9: '36px',     // 9 * 4px
  10: '40px',    // 10 * 4px
  11: '44px',    // 11 * 4px
  12: '48px',    // 12 * 4px
  14: '56px',    // 14 * 4px
  16: '64px',    // 16 * 4px
  20: '80px',    // 20 * 4px
  24: '96px',    // 24 * 4px
  28: '112px',   // 28 * 4px
  32: '128px',   // 32 * 4px
  36: '144px',   // 36 * 4px
  40: '160px',   // 40 * 4px
  44: '176px',   // 44 * 4px
  48: '192px',   // 48 * 4px
  52: '208px',   // 52 * 4px
  56: '224px',   // 56 * 4px
  60: '240px',   // 60 * 4px
  64: '256px',   // 64 * 4px
  72: '288px',   // 72 * 4px
  80: '320px',   // 80 * 4px
  96: '384px',   // 96 * 4px
} as const;

// Component-specific spacing
export const componentSpacing = {
  // Button padding
  button: {
    sm: { x: spacing[3], y: spacing[1.5] },
    md: { x: spacing[4], y: spacing[2] },
    lg: { x: spacing[6], y: spacing[3] },
    xl: { x: spacing[8], y: spacing[4] },
  },
  
  // Card padding
  card: {
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
    xl: spacing[10],
  },
  
  // Input padding
  input: {
    sm: { x: spacing[3], y: spacing[2] },
    md: { x: spacing[4], y: spacing[2.5] },
    lg: { x: spacing[5], y: spacing[3] },
  },
  
  // Modal padding
  modal: {
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
  },
  
  // Section spacing
  section: {
    xs: spacing[8],
    sm: spacing[12],
    md: spacing[16],
    lg: spacing[20],
    xl: spacing[24],
    '2xl': spacing[32],
  },
  
  // Grid gaps
  grid: {
    xs: spacing[2],
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
    xl: spacing[10],
  },
} as const;

// Layout spacing for different screen sizes
export const layoutSpacing = {
  container: {
    sm: spacing[4],    // Mobile
    md: spacing[6],    // Tablet
    lg: spacing[8],    // Desktop
    xl: spacing[10],   // Large desktop
  },
  
  sidebar: {
    width: {
      sm: spacing[64],   // 256px
      md: spacing[72],   // 288px
      lg: spacing[80],   // 320px
    },
    padding: spacing[6],
  },
  
  header: {
    height: spacing[16],  // 64px
    padding: spacing[4],
  },
  
  footer: {
    padding: {
      x: spacing[4],
      y: spacing[8],
    },
  },
} as const;

// Responsive spacing utilities
export const responsiveSpacing = {
  // Breakpoint-specific spacing
  mobile: {
    container: spacing[4],
    section: spacing[8],
    card: spacing[4],
  },
  tablet: {
    container: spacing[6],
    section: spacing[12],
    card: spacing[6],
  },
  desktop: {
    container: spacing[8],
    section: spacing[16],
    card: spacing[8],
  },
  wide: {
    container: spacing[10],
    section: spacing[20],
    card: spacing[10],
  },
} as const;

// Border radius values
export const borderRadius = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Shadow spacing (for elevation)
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Export all spacing tokens
export const spacingTokens = {
  spacing,
  component: componentSpacing,
  layout: layoutSpacing,
  responsive: responsiveSpacing,
  borderRadius,
  shadows,
} as const;

export type SpacingValue = keyof typeof spacing;
export type BorderRadiusValue = keyof typeof borderRadius;
export type ShadowValue = keyof typeof shadows;