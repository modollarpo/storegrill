'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: (input: { variant?: ToastVariant; title: string; description?: string; duration?: number }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(({
    variant = 'info',
    title,
    description,
    duration = 5000,
  }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts(prev => [...prev, { id, variant, title, description, duration, createdAt: Date.now() }]);
  }, []);

  useEffect(() => {
    if (toasts.length <= MAX_VISIBLE) return;
    const sorted = [...toasts].sort((a, b) => a.createdAt - b.createdAt);
    dismiss(sorted[0].id);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: string }> = {
  success: { bar: 'bg-feedback-success', icon: '✓' },
  error: { bar: 'bg-feedback-danger', icon: '✕' },
  warning: { bar: 'bg-feedback-warning', icon: '!' },
  info: { bar: 'bg-feedback-info', icon: 'i' },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed z-[80] bottom-4 right-4 max-md:left-4 max-md:right-4 max-md:top-4 max-md:bottom-auto flex flex-col gap-2 pointer-events-none"
    >
      {visible.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [remaining, setRemaining] = useState(100);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - started) / toast.duration) * 100);
      setRemaining(pct);
    }, 100);
    const timeout = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const styles = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="status"
      className="pointer-events-auto w-full sm:w-96 bg-surface-raised rounded-lg shadow-xl border border-smoke-150 overflow-hidden animate-toast-in relative"
    >
      <div className="flex items-start gap-3 p-3.5">
        <span className={cn('w-5 h-5 rounded-full grid place-items-center text-white text-2xs font-bold shrink-0 mt-0.5', styles.bar)}>
          {styles.icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-charcoal">{toast.title}</p>
          {toast.description && <p className="text-xs text-smoke-500 mt-0.5">{toast.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="ml-auto p-1 text-smoke-400 hover:text-charcoal transition-colors shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="h-0.5 bg-smoke-100 absolute bottom-0 inset-x-0">
        <div className={cn('h-full transition-none', styles.bar)} style={{ width: `${remaining}%` }} />
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
