import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ScreenReaderContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  setLiveRegion: (element: HTMLElement, type: 'polite' | 'assertive') => void;
  describedBy: (id: string) => { 'aria-describedby': string };
  labelledBy: (id: string) => { 'aria-labelledby': string };
  generateId: (prefix?: string) => string;
}

const ScreenReaderContext = createContext<ScreenReaderContextType | null>(null);

export const useScreenReader = () => {
  const context = useContext(ScreenReaderContext);
  if (!context) {
    throw new Error('useScreenReader must be used within a ScreenReaderProvider');
  }
  return context;
};

interface ScreenReaderProviderProps {
  children: ReactNode;
}

export const ScreenReaderProvider: React.FC<ScreenReaderProviderProps> = ({ children }) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);

  useEffect(() => {
    // Create live regions for announcements
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.id = 'live-region-polite';
    document.body.appendChild(politeRegion);
    liveRegionRef.current = politeRegion;

    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.id = 'live-region-assertive';
    document.body.appendChild(assertiveRegion);
    assertiveRegionRef.current = assertiveRegion;

    return () => {
      if (politeRegion.parentNode) {
        politeRegion.parentNode.removeChild(politeRegion);
      }
      if (assertiveRegion.parentNode) {
        assertiveRegion.parentNode.removeChild(assertiveRegion);
      }
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = priority === 'assertive' ? assertiveRegionRef.current : liveRegionRef.current;
    
    if (region) {
      // Clear the region first to ensure the announcement is read
      region.textContent = '';
      
      // Use a small delay to ensure screen readers pick up the change
      setTimeout(() => {
        region.textContent = message;
      }, 100);

      // Clear the message after a delay to prevent it from being read again
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  };

  const setLiveRegion = (element: HTMLElement, type: 'polite' | 'assertive') => {
    element.setAttribute('aria-live', type);
    element.setAttribute('aria-atomic', 'true');
  };

  const describedBy = (id: string) => ({
    'aria-describedby': id,
  });

  const labelledBy = (id: string) => ({
    'aria-labelledby': id,
  });

  const generateId = (prefix: string = 'sr') => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  };

  const value: ScreenReaderContextType = {
    announce,
    setLiveRegion,
    describedBy,
    labelledBy,
    generateId,
  };

  return (
    <ScreenReaderContext.Provider value={value}>
      {children}
    </ScreenReaderContext.Provider>
  );
};

// Hook for announcements
export const useAnnouncement = () => {
  const { announce } = useScreenReader();
  
  const announceSuccess = (message: string) => announce(`Success: ${message}`, 'polite');
  const announceError = (message: string) => announce(`Error: ${message}`, 'assertive');
  const announceWarning = (message: string) => announce(`Warning: ${message}`, 'assertive');
  const announceInfo = (message: string) => announce(`Info: ${message}`, 'polite');

  return {
    announce,
    announceSuccess,
    announceError,
    announceWarning,
    announceInfo,
  };
};

// Hook for ARIA attributes
export const useAriaAttributes = () => {
  const { describedBy, labelledBy, generateId } = useScreenReader();
  
  return {
    describedBy,
    labelledBy,
    generateId,
  };
};

// Screen reader only component
export const ScreenReaderOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// Skip link component
export const SkipLink: React.FC<{ href: string; children: ReactNode }> = ({ 
  href, 
  children 
}) => (
  <a
    href={href}
    className={`
      sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
      focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white 
      focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 
      focus:ring-primary-500 focus:ring-offset-2
    `}
  >
    {children}
  </a>
);