import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface AccessibilityContextType {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  keyboardNavigation: boolean;
  screenReaderActive: boolean;
  colorBlindnessType: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
}

interface AccessibilityPreferences {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  keyboardNavigation: boolean;
  screenReaderActive: boolean;
  colorBlindnessType: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    fontSize: 'medium',
    keyboardNavigation: false,
    screenReaderActive: false,
    colorBlindnessType: 'none',
  });

  useEffect(() => {
    // Load preferences from localStorage and detect system preferences
    const savedPreferences = localStorage.getItem('accessibility-preferences');
    let initialPreferences = {
      prefersReducedMotion: false,
      prefersHighContrast: false,
      fontSize: 'medium' as const,
      keyboardNavigation: false,
      screenReaderActive: false,
      colorBlindnessType: 'none' as const,
    };

    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        initialPreferences = { ...initialPreferences, ...parsed };
      } catch (error) {
        console.warn('Failed to parse accessibility preferences:', error);
      }
    }

    // Detect system preferences
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    initialPreferences.prefersReducedMotion = reducedMotionQuery.matches;
    initialPreferences.prefersHighContrast = highContrastQuery.matches;

    // Set all preferences at once to avoid multiple renders
    setPreferences(initialPreferences);

    // Set up listeners for system preference changes
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, prefersHighContrast: e.matches }));
    };

    // Detect keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setPreferences(prev => ({ 
          ...prev, 
          keyboardNavigation: true 
        }));
      }
    };

    const handleMouseDown = () => {
      setPreferences(prev => ({ 
        ...prev, 
        keyboardNavigation: false 
      }));
    };

    // Detect screen reader
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]');
      const hasScreenReaderText = document.querySelector('.sr-only, .screen-reader-text');
      
      if (hasAriaLive || hasScreenReaderText) {
        setPreferences(prev => ({ 
          ...prev, 
          screenReaderActive: true 
        }));
      }
    };

    // Add event listeners
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    // Delay screen reader detection to allow page to load
    const screenReaderTimeout = setTimeout(detectScreenReader, 1000);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      clearTimeout(screenReaderTimeout);
    };
  }, []); // Empty dependency array is correct here

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px',
    } as const;
    root.style.fontSize = fontSizeMap[preferences.fontSize];

    // High contrast
    if (preferences.prefersHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (preferences.prefersReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Keyboard navigation
    if (preferences.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // Color blindness simulation
    if (preferences.colorBlindnessType !== 'none') {
      root.classList.add(`color-blind-${preferences.colorBlindnessType}`);
    } else {
      root.classList.remove('color-blind-protanopia', 'color-blind-deuteranopia', 'color-blind-tritanopia');
    }
  }, [preferences]);

  const updatePreferences = (newPreferences: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      
      // Save to localStorage
      localStorage.setItem('accessibility-preferences', JSON.stringify(updated));
      
      return updated;
    });
  };

  const value: AccessibilityContextType = {
    ...preferences,
    updatePreferences,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Hook for accessibility-aware components
export const useAccessibleComponent = () => {
  const { 
    prefersReducedMotion, 
    prefersHighContrast, 
    fontSize, 
    keyboardNavigation,
    screenReaderActive 
  } = useAccessibility();

  const getAnimationProps = (normalAnimation: Record<string, unknown>, reducedAnimation: Record<string, unknown> = {}) => {
    return prefersReducedMotion ? reducedAnimation : normalAnimation;
  };

  const getContrastProps = (normalProps: Record<string, unknown>, highContrastProps: Record<string, unknown>) => {
    return prefersHighContrast ? { ...normalProps, ...highContrastProps } : normalProps;
  };

  const getFontSizeMultiplier = () => {
    const multipliers = {
      'small': 0.875,
      'medium': 1,
      'large': 1.125,
      'extra-large': 1.25,
    } as const;
    return multipliers[fontSize];
  };

  return {
    prefersReducedMotion,
    prefersHighContrast,
    fontSize,
    keyboardNavigation,
    screenReaderActive,
    getAnimationProps,
    getContrastProps,
    getFontSizeMultiplier,
  };
};