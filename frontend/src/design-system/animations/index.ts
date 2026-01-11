// Animation Provider and Context
export { AnimationProvider, useAnimation } from './AnimationProvider';

// Animation Hooks
export { 
  useAnimationControls, 
  useHoverAnimation, 
  useIntersectionAnimation 
} from './useAnimation';

// Micro-animations
export { 
  keyframes, 
  animationOptions, 
  createStaggeredAnimation,
  optimizeAnimation,
  reducedMotionKeyframes,
  reducedMotionOptions
} from './microAnimations';

// Performance Monitoring
export { 
  performanceMonitor,
  optimizeForPerformance,
  throttleAnimation,
  AnimationPool,
  globalAnimationPool,
  createPerformanceAwareObserver
} from './performanceMonitor';