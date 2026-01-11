import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface AnimationContextType {
  prefersReducedMotion: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  frameRate: number;
  enableAnimations: boolean;
}

const AnimationContext = createContext<AnimationContextType>({
  prefersReducedMotion: false,
  performanceMode: 'high',
  frameRate: 60,
  enableAnimations: true,
});

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('high');
  const [frameRate, setFrameRate] = useState(60);
  const [enableAnimations, setEnableAnimations] = useState(true);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      setEnableAnimations(!e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Performance monitoring
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFrameRate = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setFrameRate(fps);

        // Adjust performance mode based on frame rate
        if (fps < 30) {
          setPerformanceMode('low');
          setEnableAnimations(false);
        } else if (fps < 50) {
          setPerformanceMode('medium');
        } else {
          setPerformanceMode('high');
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFrameRate);
    };

    // Start monitoring after a delay to avoid initial load impact
    const timeoutId = setTimeout(() => {
      animationId = requestAnimationFrame(measureFrameRate);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const value: AnimationContextType = {
    prefersReducedMotion,
    performanceMode,
    frameRate,
    enableAnimations: enableAnimations && !prefersReducedMotion,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};