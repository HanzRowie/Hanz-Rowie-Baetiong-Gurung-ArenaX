/**
 * Micro-animation library for hover states and transitions
 * Pre-defined keyframes and animation configurations
 */

// Common keyframe definitions
export const keyframes = {
  // Hover animations
  lift: [
    { transform: 'translateY(0) scale(1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    { transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
  ],

  scale: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.05)' },
  ],

  glow: [
    { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
    { boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.3)' },
  ],

  tilt: [
    { transform: 'rotate(0deg) scale(1)' },
    { transform: 'rotate(-1deg) scale(1.02)' },
  ],

  // Focus animations
  focusRing: [
    { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
    { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)' },
  ],

  // Press animations
  press: [
    { transform: 'scale(1)' },
    { transform: 'scale(0.98) translateY(1px)' },
  ],

  // Loading animations
  spin: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(360deg)' },
  ],

  pulse: [
    { opacity: '1', transform: 'scale(1)' },
    { opacity: '0.7', transform: 'scale(1.05)' },
    { opacity: '1', transform: 'scale(1)' },
  ],

  bounce: [
    { transform: 'translateY(0)' },
    { transform: 'translateY(-10px)' },
    { transform: 'translateY(0)' },
  ],

  // Entrance animations
  fadeIn: [
    { opacity: '0' },
    { opacity: '1' },
  ],

  slideInUp: [
    { opacity: '0', transform: 'translateY(20px)' },
    { opacity: '1', transform: 'translateY(0)' },
  ],

  slideInDown: [
    { opacity: '0', transform: 'translateY(-20px)' },
    { opacity: '1', transform: 'translateY(0)' },
  ],

  slideInLeft: [
    { opacity: '0', transform: 'translateX(-20px)' },
    { opacity: '1', transform: 'translateX(0)' },
  ],

  slideInRight: [
    { opacity: '0', transform: 'translateX(20px)' },
    { opacity: '1', transform: 'translateX(0)' },
  ],

  scaleIn: [
    { opacity: '0', transform: 'scale(0.9)' },
    { opacity: '1', transform: 'scale(1)' },
  ],

  // Exit animations
  fadeOut: [
    { opacity: '1' },
    { opacity: '0' },
  ],

  slideOutUp: [
    { opacity: '1', transform: 'translateY(0)' },
    { opacity: '0', transform: 'translateY(-20px)' },
  ],

  slideOutDown: [
    { opacity: '1', transform: 'translateY(0)' },
    { opacity: '0', transform: 'translateY(20px)' },
  ],

  scaleOut: [
    { opacity: '1', transform: 'scale(1)' },
    { opacity: '0', transform: 'scale(0.9)' },
  ],

  // Special effects
  shake: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(0)' },
  ],

  wobble: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-5deg)' },
    { transform: 'rotate(3deg)' },
    { transform: 'rotate(-3deg)' },
    { transform: 'rotate(2deg)' },
    { transform: 'rotate(0deg)' },
  ],

  heartbeat: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.1)' },
    { transform: 'scale(1)' },
    { transform: 'scale(1.1)' },
    { transform: 'scale(1)' },
  ],
} as const;

// Animation options presets
export const animationOptions = {
  // Hover animations
  hover: {
    duration: 150,
    easing: 'ease-out',
    fill: 'both' as const,
  },

  // Focus animations
  focus: {
    duration: 150,
    easing: 'ease-out',
    fill: 'both' as const,
  },

  // Press animations
  press: {
    duration: 100,
    easing: 'ease-in',
    fill: 'both' as const,
  },

  // Loading animations
  loading: {
    duration: 1000,
    easing: 'linear',
    iterations: Infinity,
    fill: 'both' as const,
  },

  // Entrance animations
  entrance: {
    duration: 300,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    fill: 'both' as const,
  },

  // Exit animations
  exit: {
    duration: 200,
    easing: 'ease-in',
    fill: 'both' as const,
  },

  // Special effects
  special: {
    duration: 500,
    easing: 'ease-in-out',
    fill: 'both' as const,
  },
} as const;

// Stagger animation utilities
export const createStaggeredAnimation = (
  elements: HTMLElement[],
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  baseOptions: KeyframeAnimationOptions,
  staggerDelay: number = 100
) => {
  const animations: Animation[] = [];

  elements.forEach((element, index) => {
    const options = {
      ...baseOptions,
      delay: (baseOptions.delay || 0) + (index * staggerDelay),
    };

    const animation = element.animate(keyframes, options);
    animations.push(animation);
  });

  return {
    animations,
    play: () => animations.forEach(anim => anim.play()),
    pause: () => animations.forEach(anim => anim.pause()),
    cancel: () => animations.forEach(anim => anim.cancel()),
    finish: () => animations.forEach(anim => anim.finish()),
  };
};

// Performance optimization utilities
export const optimizeAnimation = (element: HTMLElement) => {
  // Enable hardware acceleration
  element.style.willChange = 'transform, opacity';
  element.style.transform = 'translateZ(0)';
  
  return () => {
    // Cleanup
    element.style.willChange = 'auto';
    element.style.transform = '';
  };
};

// Reduced motion alternatives
export const reducedMotionKeyframes = {
  lift: [
    { opacity: '1' },
    { opacity: '0.8' },
  ],

  scale: [
    { opacity: '1' },
    { opacity: '0.9' },
  ],

  glow: [
    { opacity: '1' },
    { opacity: '0.8' },
  ],

  entrance: [
    { opacity: '0' },
    { opacity: '1' },
  ],

  exit: [
    { opacity: '1' },
    { opacity: '0' },
  ],
} as const;

export const reducedMotionOptions = {
  duration: 150,
  easing: 'linear',
  fill: 'both' as const,
} as const;