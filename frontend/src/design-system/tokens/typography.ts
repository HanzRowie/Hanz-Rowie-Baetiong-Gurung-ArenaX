/**
 * Typography Design Tokens
 * Consistent font weights, sizes, and line heights
 */

// Font families
export const fontFamilies = {
  heading: ['Inter', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
} as const;

// Font weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Font sizes with consistent scale
export const fontSizes = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
  '6xl': '3.75rem',   // 60px
  '7xl': '4.5rem',    // 72px
  '8xl': '6rem',      // 96px
  '9xl': '8rem',      // 128px
} as const;

// Line heights
export const lineHeights = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// Letter spacing
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Typography scale definitions
export const typographyScale = {
  // Display styles for hero sections
  display: {
    '2xl': {
      fontSize: fontSizes['8xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    xl: {
      fontSize: fontSizes['7xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    lg: {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    md: {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    sm: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.normal,
    },
  },
  
  // Heading styles
  heading: {
    h1: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    h2: {
      fontSize: fontSizes['3xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
    },
    h3: {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.normal,
    },
    h4: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.normal,
    },
    h5: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
    },
    h6: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
    },
  },
  
  // Body text styles
  body: {
    xl: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
    },
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.wide,
    },
  },
  
  // Caption and label styles
  caption: {
    lg: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wide,
    },
    md: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wide,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.wider,
    },
  },
  
  // Code and monospace styles
  code: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    md: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
  },
} as const;

// Export all typography tokens
export const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  scale: typographyScale,
} as const;

export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type LineHeight = keyof typeof lineHeights;
export type LetterSpacing = keyof typeof letterSpacing;