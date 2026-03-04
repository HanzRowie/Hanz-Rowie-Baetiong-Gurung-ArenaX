/**
 * useKeyboardNavigation Hook
 * 
 * React hook for managing keyboard navigation and focus management.
 * 
 * Requirements:
 * - 19.2, 19.3, 19.4: Keyboard navigation support
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  initKeyboardNavigation,
  trapFocus,
  createFocusManager,
  registerKeyboardShortcuts,
  announceToScreenReader,
} from '../utils/keyboardNavigation';

/**
 * Initialize keyboard navigation detection on mount
 * 
 * Adds visual focus indicators for keyboard users
 */
export function useKeyboardNavigationDetection() {
  useEffect(() => {
    const cleanup = initKeyboardNavigation();
    return cleanup;
  }, []);
}

/**
 * Trap focus within a modal or dialog
 * 
 * @param isActive - Whether focus trap should be active
 * @returns Ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!isActive || !elementRef.current) return;

    const cleanup = trapFocus(elementRef.current);
    return cleanup;
  }, [isActive]);

  return elementRef;
}

/**
 * Manage focus restoration when component unmounts
 * 
 * Useful for modals to return focus to trigger element
 * 
 * @param isOpen - Whether the component is open
 */
export function useFocusRestore(isOpen: boolean) {
  const focusManager = useRef(createFocusManager());

  useEffect(() => {
    if (isOpen) {
      focusManager.current.save();
    } else {
      focusManager.current.restore();
    }
  }, [isOpen]);
}

/**
 * Register keyboard shortcuts
 * 
 * @param shortcuts - Map of key combinations to handlers
 * @param enabled - Whether shortcuts should be active
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const cleanup = registerKeyboardShortcuts(shortcuts);
    return cleanup;
  }, [shortcuts, enabled]);
}

/**
 * Announce message to screen readers
 * 
 * @returns Function to announce messages
 */
export function useScreenReaderAnnouncement() {
  return useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );
}

/**
 * Handle arrow key navigation in a list
 * 
 * @param itemCount - Number of items in the list
 * @param onSelect - Callback when item is selected (Enter/Space)
 * @returns Props to spread on list container
 */
export function useArrowKeyNavigation(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          currentIndexRef.current = Math.min(
            currentIndexRef.current + 1,
            itemCount - 1
          );
          break;

        case 'ArrowUp':
          event.preventDefault();
          currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
          break;

        case 'Home':
          event.preventDefault();
          currentIndexRef.current = 0;
          break;

        case 'End':
          event.preventDefault();
          currentIndexRef.current = itemCount - 1;
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onSelect) {
            onSelect(currentIndexRef.current);
          }
          break;
      }
    },
    [itemCount, onSelect]
  );

  return {
    onKeyDown: handleKeyDown,
    role: 'listbox',
    'aria-activedescendant': `item-${currentIndexRef.current}`,
  };
}

/**
 * Handle Escape key to close modal/dialog
 * 
 * @param onClose - Callback to close the component
 * @param isOpen - Whether the component is open
 */
export function useEscapeKey(onClose: () => void, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isOpen]);
}

/**
 * Auto-focus element when component mounts
 * 
 * @returns Ref to attach to the element to focus
 */
export function useAutoFocus<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.focus();
    }
  }, []);

  return elementRef;
}

/**
 * Manage roving tabindex for a group of elements
 * 
 * Only one element in the group is tabbable at a time,
 * but arrow keys can navigate between them.
 * 
 * @param itemCount - Number of items in the group
 * @returns Current active index and navigation handlers
 */
export function useRovingTabIndex(itemCount: number) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((index + 1) % itemCount);
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((index - 1 + itemCount) % itemCount);
          break;

        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setActiveIndex(itemCount - 1);
          break;
      }
    },
    [itemCount]
  );

  return {
    activeIndex,
    setActiveIndex,
    getTabIndex: (index: number) => (index === activeIndex ? 0 : -1),
    handleKeyDown,
  };
}

// Re-export React for the useState usage above
import React from 'react';
