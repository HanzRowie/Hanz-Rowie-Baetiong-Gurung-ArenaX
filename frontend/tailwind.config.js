import { colors, typography, spacingTokens, animations, responsive } from './src/design-system/tokens/index.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        ...colors,
        
        // Role-specific colors
        player: colors.role.player,
        organizer: colors.role.organizer,
        referee: colors.role.referee,
        venue: colors.role.venue_owner,
        
        // Semantic colors
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        info: colors.semantic.info,
        
        // Surface colors
        surface: colors.surface,
        
        // Text colors
        'text-primary': colors.text.primary,
        'text-secondary': colors.text.secondary,
        'text-tertiary': colors.text.tertiary,
        'text-inverse': colors.text.inverse,
        'text-disabled': colors.text.disabled,
        
        // Border colors
        'border-primary': colors.border.primary,
        'border-secondary': colors.border.secondary,
        'border-tertiary': colors.border.tertiary,
        'border-focus': colors.border.focus,
        'border-error': colors.border.error,
        'border-success': colors.border.success,
      },
      
      fontFamily: {
        heading: typography.fontFamilies.heading,
        body: typography.fontFamilies.body,
        mono: typography.fontFamilies.mono,
      },
      
      fontSize: typography.fontSizes,
      fontWeight: typography.fontWeights,
      lineHeight: typography.lineHeights,
      letterSpacing: typography.letterSpacing,
      
      spacing: spacingTokens.spacing,
      borderRadius: spacingTokens.borderRadius,
      boxShadow: spacingTokens.shadows,
      
      transitionDuration: animations.durations,
      transitionTimingFunction: animations.easings,
      
      screens: responsive.breakpoints,
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-10px) translateX(5px)' },
        },
      },
    },
  },
  plugins: [
    // Custom plugin for role-specific utilities
    function({ addUtilities, theme }) {
      const roleColors = theme('colors.role') || {};
      const roleUtilities = {};
      
      Object.keys(roleColors).forEach(role => {
        roleUtilities[`.role-${role}`] = {
          '--role-primary': roleColors[role].primary,
          '--role-secondary': roleColors[role].secondary,
          '--role-accent': roleColors[role].accent,
        };
      });
      
      addUtilities(roleUtilities);
    },
    
    // Custom plugin for animation utilities
    function({ addUtilities, theme }) {
      const durations = theme('transitionDuration') || {};
      const easings = theme('transitionTimingFunction') || {};
      
      const animationUtilities = {
        '.animate-hover-lift': {
          transition: `transform ${durations.fast} ${easings.easeOut}`,
          '&:hover': {
            transform: 'translateY(-4px) scale(1.02)',
          },
        },
        '.animate-hover-scale': {
          transition: `transform ${durations.fast} ${easings.easeOut}`,
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
        '.animate-press': {
          transition: `transform ${durations.instant} ${easings.easeIn}`,
          '&:active': {
            transform: 'translateY(1px) scale(0.98)',
          },
        },
      };
      
      addUtilities(animationUtilities);
    },
  ],
}
