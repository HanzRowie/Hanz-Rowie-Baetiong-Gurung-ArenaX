import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface FocusContextType {
  trapFocus: (element: HTMLElement) => () => void;
  restoreFocus: (element: HTMLElement | null) => void;
  moveFocus: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  getFocusableElements: (container: HTMLElement) => HTMLElement[];
}

const FocusContext = createContext<FocusContextType | null>(null);

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};

interface FocusProviderProps {
  children: ReactNode;
}

export const FocusProvider: React.FC<FocusProviderProps> = ({ children }) => {
  const focusHistoryRef = useRef<HTMLElement[]>([]);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    
    return elements.filter(element => {
      // Check if element is visible and not hidden
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      );
    });
  };

  const trapFocus = (element: HTMLElement) => {
    const focusableElements = getFocusableElements(element);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store current focus
    const previousFocus = document.activeElement as HTMLElement;
    if (previousFocus) {
      focusHistoryRef.current.push(previousFocus);
    }

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab (forward)
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      const previousFocus = focusHistoryRef.current.pop();
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  };

  const restoreFocus = (element: HTMLElement | null) => {
    if (element && document.contains(element)) {
      element.focus();
    } else {
      const lastFocus = focusHistoryRef.current.pop();
      if (lastFocus && document.contains(lastFocus)) {
        lastFocus.focus();
      }
    }
  };

  const moveFocus = (direction: 'next' | 'previous' | 'first' | 'last') => {
    const currentElement = document.activeElement as HTMLElement;
    if (!currentElement) return;

    const container = currentElement.closest('[role="dialog"], [role="menu"], body') as HTMLElement;
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(currentElement);

    let targetIndex: number;

    switch (direction) {
      case 'next':
        targetIndex = currentIndex + 1;
        if (targetIndex >= focusableElements.length) {
          targetIndex = 0; // Wrap to first
        }
        break;
      case 'previous':
        targetIndex = currentIndex - 1;
        if (targetIndex < 0) {
          targetIndex = focusableElements.length - 1; // Wrap to last
        }
        break;
      case 'first':
        targetIndex = 0;
        break;
      case 'last':
        targetIndex = focusableElements.length - 1;
        break;
      default:
        return;
    }

    const targetElement = focusableElements[targetIndex];
    if (targetElement) {
      targetElement.focus();
    }
  };

  const value: FocusContextType = {
    trapFocus,
    restoreFocus,
    moveFocus,
    getFocusableElements,
  };

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  );
};

// Hook for focus trap
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLElement>(null);
  const { trapFocus } = useFocus();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      cleanupRef.current = trapFocus(containerRef.current);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isActive, trapFocus]);

  return containerRef;
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
  keys: Record<string, () => void>,
  isActive: boolean = true
) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = keys[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keys, isActive]);
};