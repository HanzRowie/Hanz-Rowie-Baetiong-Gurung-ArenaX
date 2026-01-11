import { useEffect, useRef, useState } from 'react';
import { useAnimation as useAnimationContext } from './AnimationProvider';

interface UseAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  playState?: 'running' | 'paused';
}

interface AnimationControls {
  play: () => void;
  pause: () => void;
  cancel: () => void;
  finish: () => void;
  reverse: () => void;
  isPlaying: boolean;
  progress: number;
}

export const useAnimationControls = (
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: UseAnimationOptions = {}
): [React.RefObject<HTMLElement | null>, AnimationControls] => {
  const elementRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { enableAnimations } = useAnimationContext();

  const defaultOptions: KeyframeAnimationOptions = {
    duration: options.duration || 300,
    delay: options.delay || 0,
    easing: options.easing || 'ease-out',
    fill: options.fillMode || 'both',
    iterations: typeof options.iterationCount === 'string' ? Infinity : (options.iterationCount || 1),
    direction: options.direction || 'normal',
  };

  const play = () => {
    if (!elementRef.current || !enableAnimations) return;

    // Cancel existing animation
    if (animationRef.current) {
      animationRef.current.cancel();
    }

    // Create new animation
    animationRef.current = elementRef.current.animate(keyframes, defaultOptions);
    setIsPlaying(true);

    // Set up event listeners
    animationRef.current.addEventListener('finish', () => {
      setIsPlaying(false);
      setProgress(1);
    });

    animationRef.current.addEventListener('cancel', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    // Update progress
    const updateProgress = () => {
      if (animationRef.current) {
        const currentTime = animationRef.current.currentTime || 0;
        const duration = animationRef.current.effect?.getComputedTiming().duration || 1;
        setProgress(Math.min(Number(currentTime) / Number(duration), 1));
        
        if (isPlaying) {
          requestAnimationFrame(updateProgress);
        }
      }
    };
    
    requestAnimationFrame(updateProgress);
  };

  const pause = () => {
    if (animationRef.current) {
      animationRef.current.pause();
      setIsPlaying(false);
    }
  };

  const cancel = () => {
    if (animationRef.current) {
      animationRef.current.cancel();
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const finish = () => {
    if (animationRef.current) {
      animationRef.current.finish();
      setIsPlaying(false);
      setProgress(1);
    }
  };

  const reverse = () => {
    if (animationRef.current) {
      animationRef.current.reverse();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, []);

  const controls: AnimationControls = {
    play,
    pause,
    cancel,
    finish,
    reverse,
    isPlaying,
    progress,
  };

  return [elementRef, controls] as const;
};

// Hook for simple hover animations
export const useHoverAnimation = (
  hoverKeyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: UseAnimationOptions = {}
) => {
  const [elementRef, controls] = useAnimationControls(hoverKeyframes, options);
  const { enableAnimations } = useAnimationContext();

  const handleMouseEnter = () => {
    if (enableAnimations) {
      controls.play();
    }
  };

  const handleMouseLeave = () => {
    if (enableAnimations) {
      controls.reverse();
    }
  };

  return {
    ref: elementRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...controls,
  };
};

// Hook for intersection-based animations
export const useIntersectionAnimation = (
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: UseAnimationOptions & { threshold?: number; rootMargin?: string } = {}
) => {
  const [elementRef, controls] = useAnimationControls(keyframes, options);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            controls.play();
            setHasAnimated(true);
          }
        });
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [controls, hasAnimated, options.threshold, options.rootMargin]);

  return [elementRef, controls] as const;
};