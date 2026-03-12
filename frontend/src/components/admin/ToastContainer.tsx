/**
 * ToastContainer - Centralized toast notification container
 * 
 * Features:
 * - Fixed positioning at top-right with proper z-index
 * - Prevents duplicate toasts
 * - Smooth animations
 * - Accessible ARIA live region
 * - Uses React Portal to render outside the component tree
 */

import React, { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastMessage } from './Toast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent duplicate toasts by checking if similar toast already exists
  const uniqueToasts = useCallback(() => {
    const seen = new Map<string, ToastMessage>();
    
    toasts.forEach(toast => {
      // Create a key based on type, title, and message
      const key = `${toast.type}-${toast.title}-${toast.message}`;
      
      // Only keep the most recent toast with the same content
      if (!seen.has(key) || seen.get(key)!.id < toast.id) {
        seen.set(key, toast);
      }
    });
    
    return Array.from(seen.values());
  }, [toasts]);

  const displayToasts = uniqueToasts();

  if (displayToasts.length === 0) return null;

  // Render toast container using portal to ensure it's at the top level
  return createPortal(
    <div
      ref={containerRef}
      className="toast-container fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        width: '400px'
      }}
    >
      {displayToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
};
