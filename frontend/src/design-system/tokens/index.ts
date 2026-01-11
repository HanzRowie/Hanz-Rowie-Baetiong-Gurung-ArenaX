/**
 * Design Tokens Index
 * Central export for all design tokens
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';
export * from './breakpoints';

// Re-export as organized modules
export { colors } from './colors';
export { typography } from './typography';
export { spacingTokens as spacing } from './spacing';
export { animations } from './animations';
export { responsive } from './breakpoints';

// Combined design tokens object
import { colors } from './colors';
import { typography } from './typography';
import { spacingTokens } from './spacing';
import { animations } from './animations';
import { responsive } from './breakpoints';

export const designTokens = {
  colors,
  typography,
  spacing: spacingTokens,
  animations,
  responsive,
} as const;

// Theme configuration type
export interface ThemeConfig {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacingTokens;
  animations: typeof animations;
  responsive: typeof responsive;
}

// Default theme
export const defaultTheme: ThemeConfig = {
  colors,
  typography,
  spacing: spacingTokens,
  animations,
  responsive,
};