/**
 * Animation Design Tokens
 * Consistent timing, easing, and transform values
 */

// Animation durations
export const durations = {
  instant: '0ms',
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '750ms',
  slowest: '1000ms',
} as const;

// Easing functions
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  backIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  backInOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Transform values
export const transforms = {
  // Scale transforms
  scaleUp: 'scale(1.05)',
  scaleDown: 'scale(0.95)',
  scaleUpLarge: 'scale(1.1)',
  scaleDownSmall: 'scale(0.98)',
  
  // Translate transforms
  slideUp: 'translateY(-8px)',
  slideDown: 'translateY(8px)',
  slideLeft: 'translateX(-8px)',
  slideRight: 'translateX(8px)',
  slideUpLarge: 'translateY(-16px)',
  slideDownLarge: 'translateY(16px)',
  
  // Rotate transforms
  rotate90: 'rotate(90deg)',
  rotate180: 'rotate(180deg)',
  rotate270: 'rotate(270deg)',
  rotateNeg90: 'rotate(-90deg)',
  
  // Combined transforms
  liftAndScale: 'translateY(-4px) scale(1.02)',
  pressAndScale: 'translateY(1px) scale(0.98)',
  tiltLeft: 'rotate(-1deg) scale(1.02)',
  tiltRight: 'rotate(1deg) scale(1.02)',
} as const;

// Animation presets for common interactions
export const animationPresets = {
  // Hover animations
  hover: {
    lift: {
      duration: durations.fast,
      easing: easings.easeOut,
      transform: transforms.liftAndScale,
    },
    scale: {
      duration: durations.fast,
      easing: easings.easeOut,
      transform: transforms.scaleUp,
    },
    glow: {
      duration: durations.normal,
      easing: easings.easeInOut,
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
    },
    tilt: {
      duration: durations.fast,
      easing: easings.easeOut,
      transform: transforms.tiltLeft,
    },
  },
  
  // Focus animations
  focus: {
    ring: {
      duration: durations.fast,
      easing: easings.easeOut,
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
    },
    scale: {
      duration: durations.fast,
      easing: easings.easeOut,
      transform: 'scale(1.02)',
    },
  },
  
  // Active/pressed animations
  active: {
    press: {
      duration: durations.instant,
      easing: easings.easeIn,
      transform: transforms.pressAndScale,
    },
    bounce: {
      duration: durations.normal,
      easing: easings.bounce,
      transform: 'scale(1.1)',
    },
  },
  
  // Loading animations
  loading: {
    spin: {
      duration: durations.slowest,
      easing: easings.linear,
      transform: transforms.rotate180,
      iterationCount: 'infinite',
    },
    pulse: {
      duration: durations.slower,
      easing: easings.easeInOut,
      opacity: '0.5',
      iterationCount: 'infinite',
      direction: 'alternate',
    },
    bounce: {
      duration: durations.slow,
      easing: easings.bounce,
      transform: 'translateY(-10px)',
      iterationCount: 'infinite',
      direction: 'alternate',
    },
  },
  
  // Entrance animations
  entrance: {
    fadeIn: {
      duration: durations.normal,
      easing: easings.easeOut,
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    slideInUp: {
      duration: durations.normal,
      easing: easings.easeOut,
      from: { 
        opacity: '0',
        transform: 'translateY(20px)',
      },
      to: { 
        opacity: '1',
        transform: 'translateY(0)',
      },
    },
    slideInDown: {
      duration: durations.normal,
      easing: easings.easeOut,
      from: { 
        opacity: '0',
        transform: 'translateY(-20px)',
      },
      to: { 
        opacity: '1',
        transform: 'translateY(0)',
      },
    },
    scaleIn: {
      duration: durations.normal,
      easing: easings.backOut,
      from: { 
        opacity: '0',
        transform: 'scale(0.9)',
      },
      to: { 
        opacity: '1',
        transform: 'scale(1)',
      },
    },
  },
  
  // Exit animations
  exit: {
    fadeOut: {
      duration: durations.fast,
      easing: easings.easeIn,
      from: { opacity: '1' },
      to: { opacity: '0' },
    },
    slideOutUp: {
      duration: durations.fast,
      easing: easings.easeIn,
      from: { 
        opacity: '1',
        transform: 'translateY(0)',
      },
      to: { 
        opacity: '0',
        transform: 'translateY(-20px)',
      },
    },
    scaleOut: {
      duration: durations.fast,
      easing: easings.easeIn,
      from: { 
        opacity: '1',
        transform: 'scale(1)',
      },
      to: { 
        opacity: '0',
        transform: 'scale(0.9)',
      },
    },
  },
} as const;

// Stagger delays for sequential animations
export const staggerDelays = {
  xs: '50ms',
  sm: '100ms',
  md: '150ms',
  lg: '200ms',
  xl: '300ms',
} as const;

// Reduced motion alternatives
export const reducedMotionPresets = {
  // Simplified animations for accessibility
  hover: {
    opacity: {
      duration: durations.fast,
      easing: easings.easeOut,
      opacity: '0.8',
    },
  },
  focus: {
    outline: {
      duration: durations.instant,
      easing: easings.linear,
      outline: '2px solid #3b82f6',
    },
  },
  entrance: {
    fadeIn: {
      duration: durations.fast,
      easing: easings.linear,
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
  },
} as const;

// Performance optimization settings
export const performanceSettings = {
  // Will-change properties for GPU acceleration
  willChange: {
    transform: 'transform',
    opacity: 'opacity',
    scroll: 'scroll-position',
    contents: 'contents',
    auto: 'auto',
  },
  
  // Transform3d for hardware acceleration
  transform3d: {
    enable: 'translateZ(0)',
    disable: 'none',
  },
  
  // Animation fill modes
  fillMode: {
    none: 'none',
    forwards: 'forwards',
    backwards: 'backwards',
    both: 'both',
  },
} as const;

// Export all animation tokens
export const animations = {
  durations,
  easings,
  transforms,
  presets: animationPresets,
  staggerDelays,
  reducedMotion: reducedMotionPresets,
  performance: performanceSettings,
} as const;

export type Duration = keyof typeof durations;
export type Easing = keyof typeof easings;
export type Transform = keyof typeof transforms;
export type StaggerDelay = keyof typeof staggerDelays;