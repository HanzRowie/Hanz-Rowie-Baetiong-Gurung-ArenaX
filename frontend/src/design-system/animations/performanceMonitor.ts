/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  animationCount: number;
  lastFrameTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    memoryUsage: 0,
    animationCount: 0,
    lastFrameTime: 0,
  };

  private frameCount = 0;
  private lastTime = performance.now();
  private animationId: number | null = null;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  private activeAnimations = new Set<Animation>();

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    const monitor = () => {
      const currentTime = performance.now();
      this.frameCount++;

      // Calculate FPS every second
      if (currentTime - this.lastTime >= 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
        this.frameCount = 0;
        this.lastTime = currentTime;

        // Update memory usage if available
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        }

        // Update animation count
        this.metrics.animationCount = this.activeAnimations.size;
        this.metrics.lastFrameTime = currentTime;

        // Notify callbacks
        this.callbacks.forEach(callback => callback(this.metrics));
      }

      this.animationId = requestAnimationFrame(monitor);
    };

    this.animationId = requestAnimationFrame(monitor);
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  public trackAnimation(animation: Animation) {
    this.activeAnimations.add(animation);
    
    const cleanup = () => {
      this.activeAnimations.delete(animation);
    };

    animation.addEventListener('finish', cleanup);
    animation.addEventListener('cancel', cleanup);

    return cleanup;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public isPerformanceLow(): boolean {
    return this.metrics.fps < 30 || this.metrics.memoryUsage > 100;
  }

  public getRecommendedQuality(): 'high' | 'medium' | 'low' {
    if (this.metrics.fps >= 55 && this.metrics.memoryUsage < 50) {
      return 'high';
    } else if (this.metrics.fps >= 30 && this.metrics.memoryUsage < 100) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.callbacks = [];
    this.activeAnimations.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance optimization utilities
export const optimizeForPerformance = (quality: 'high' | 'medium' | 'low') => {
  const optimizations = {
    high: {
      enableComplexAnimations: true,
      maxConcurrentAnimations: 20,
      enableBlur: true,
      enableShadows: true,
      animationDuration: 300,
    },
    medium: {
      enableComplexAnimations: true,
      maxConcurrentAnimations: 10,
      enableBlur: false,
      enableShadows: true,
      animationDuration: 200,
    },
    low: {
      enableComplexAnimations: false,
      maxConcurrentAnimations: 5,
      enableBlur: false,
      enableShadows: false,
      animationDuration: 100,
    },
  };

  return optimizations[quality];
};

// Frame rate optimization
export const throttleAnimation = (callback: () => void, fps: number = 60) => {
  const interval = 1000 / fps;
  let lastTime = 0;

  return () => {
    const currentTime = performance.now();
    if (currentTime - lastTime >= interval) {
      callback();
      lastTime = currentTime;
    }
  };
};

// Memory management for animations
export class AnimationPool {
  private pool: Animation[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  public getAnimation(
    element: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options?: KeyframeAnimationOptions
  ): Animation {
    // Try to reuse an existing animation
    const reusableAnimation = this.pool.find(anim => 
      anim.playState === 'finished' || anim.playState === 'idle'
    );

    if (reusableAnimation) {
      // Reset and reuse
      reusableAnimation.cancel();
      const newAnimation = element.animate(keyframes, options);
      
      // Replace in pool
      const index = this.pool.indexOf(reusableAnimation);
      this.pool[index] = newAnimation;
      
      return newAnimation;
    }

    // Create new animation
    const animation = element.animate(keyframes, options);
    
    // Add to pool if not full
    if (this.pool.length < this.maxSize) {
      this.pool.push(animation);
    }

    return animation;
  }

  public cleanup() {
    this.pool.forEach(animation => {
      if (animation.playState !== 'running') {
        animation.cancel();
      }
    });
    
    this.pool = this.pool.filter(animation => 
      animation.playState === 'running'
    );
  }

  public destroy() {
    this.pool.forEach(animation => animation.cancel());
    this.pool = [];
  }
}

// Global animation pool
export const globalAnimationPool = new AnimationPool();

// Intersection Observer for performance-aware animations
export const createPerformanceAwareObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const performanceCallback = (entries: IntersectionObserverEntry[]) => {
    const quality = performanceMonitor.getRecommendedQuality();
    
    if (quality === 'low') {
      // Skip complex animations in low performance mode
      const simplifiedEntries = entries.filter(entry => entry.isIntersecting);
      if (simplifiedEntries.length > 0) {
        callback(simplifiedEntries);
      }
    } else {
      callback(entries);
    }
  };

  return new IntersectionObserver(performanceCallback, options);
};