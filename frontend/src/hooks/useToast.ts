/**
 * useToast - Custom hook for managing toast notifications
 * 
 * Features:
 * - Prevents duplicate toasts
 * - Auto-dismissal after duration
 * - Centralized toast management
 */

import { useState, useCallback, useRef } from 'react';
import type { ToastMessage } from '@/components/admin/Toast';

interface UseToastReturn {
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((
    type: ToastMessage['type'],
    title: string,
    message: string,
    duration: number = 5000
  ) => {
    // Create a unique key for deduplication
    const contentKey = `${type}-${title}-${message}`;
    const now = Date.now();
    
    // Check if a similar toast was shown recently (within 1 second)
    const lastShown = recentToastsRef.current.get(contentKey);
    if (lastShown && now - lastShown < 1000) {
      console.log('Duplicate toast prevented:', { type, title, message });
      return;
    }
    
    // Update the last shown time
    recentToastsRef.current.set(contentKey, now);
    
    // Clean up old entries from the map (older than 5 seconds)
    recentToastsRef.current.forEach((time, key) => {
      if (now - time > 5000) {
        recentToastsRef.current.delete(key);
      }
    });
    
    // Create new toast
    const id = `toast-${now}-${Math.random().toString(36).substring(2, 11)}`;
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration,
    };
    
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
    recentToastsRef.current.clear();
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
  };
}
