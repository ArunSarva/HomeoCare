import React, { createContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '../types';

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration: number = 5000): void => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string): void => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};
