/**
 * Keyboard Navigation Utilities
 * 
 * Provides utilities for detecting and managing keyboard navigation.
 * Adds visual focus indicators only for keyboard users.
 * 
 * Requirements:
 * - 19.2, 19.3, 19.4: Keyboard navigation support
 */

/**
 * Initialize keyboard navigation detection
 * 
 * Adds 'keyboard-navigation' class to body when Tab key is pressed,
 * removes it when mouse is used. This allows for different focus
 * styles for keyboard vs mouse users.
 */
export function initKeyboardNavigation(): () => void {
  let isKeyboardUser = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (!isKeyboardUser) {
        isKeyboardUser = true;
        document.body.classList.add('keyboard-navigation');
      }
    }
  };

  const handleMouseDown = () => {
    if (isKeyboardUser) {
      isKeyboardUser = false;
      document.body.classList.remove('keyboard-navigation');
    }
  };

  // Add event listeners
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
    document.body.classList.remove('keyboard-navigation');
  };
}

/**
 * Trap focus within a modal or dialog
 * 
 * Ensures keyboard focus stays within the specified element,
 * cycling through focusable elements.
 * 
 * @param element - The container element to trap focus within
 * @returns Cleanup function to remove focus trap
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const getFocusableElements = (): HTMLElement[] => {
    return Array.from(element.querySelectorAll(focusableSelectors));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: Move focus backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: Move focus forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Focus first element
  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to a previously focused element
 * 
 * Useful for modals/dialogs to return focus to the trigger element
 * when closed.
 * 
 * @returns Object with save and restore functions
 */
export function createFocusManager() {
  let previouslyFocusedElement: HTMLElement | null = null;

  return {
    save: () => {
      previouslyFocusedElement = document.activeElement as HTMLElement;
    },
    restore: () => {
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
      }
    },
  };
}

/**
 * Handle keyboard shortcuts for common actions
 * 
 * @param shortcuts - Map of key combinations to handler functions
 * @returns Cleanup function to remove keyboard shortcuts
 */
export function registerKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Build key combination string (e.g., "ctrl+s", "alt+n")
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');

    const key = event.key.toLowerCase();
    const combination = [...modifiers, key].join('+');

    // Check if this combination has a handler
    const handler = shortcuts[combination];
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 * 
 * Creates a temporary live region to announce a message,
 * then removes it after announcement.
 * 
 * @param message - Message to announce
 * @param priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement (give screen readers time to read)
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is visible and focusable
 * 
 * @param element - Element to check
 * @returns True if element is visible and focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.offsetParent === null) return false; // Hidden
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;

  return true;
}

/**
 * Get next focusable element in tab order
 * 
 * @param current - Current focused element
 * @param reverse - If true, get previous element
 * @returns Next focusable element or null
 */
export function getNextFocusableElement(
  current: HTMLElement,
  reverse: boolean = false
): HTMLElement | null {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const allFocusable = Array.from(
    document.querySelectorAll<HTMLElement>(focusableSelectors)
  ).filter(isFocusable);

  const currentIndex = allFocusable.indexOf(current);
  if (currentIndex === -1) return null;

  const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0) return allFocusable[allFocusable.length - 1];
  if (nextIndex >= allFocusable.length) return allFocusable[0];

  return allFocusable[nextIndex];
}
