'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

let pushToast: ((kind: ToastKind, text: string) => void) | null = null;

export function toast(kind: ToastKind, text: string) {
  pushToast?.(kind, text);
}

export function toastSuccess(text: string) {
  toast('success', text);
}

export function toastError(text: string) {
  toast('error', text);
}

export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let seq = 0;
    pushToast = (kind, text) => {
      const id = ++seq;
      setMessages(prev => [...prev.slice(-2), { id, kind, text }]);
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 4500);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div aria-live="polite" className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 pointer-events-none">
      {messages.map(m => (
        <div
          key={m.id}
          role="status"
          className={cn(
            'pointer-events-auto w-80 rounded-lg border px-3.5 py-3 text-xs font-medium shadow-popover bg-surface-raised animate-in',
            m.kind === 'success' && 'border-emerald-200 text-emerald-800',
            m.kind === 'error' && 'border-rose-200 text-rose-800',
            m.kind === 'info' && 'border-slate-200 text-slate-700'
          )}
        >
          {m.kind === 'success' && <span className="mr-1.5 font-bold">✓</span>}
          {m.kind === 'error' && <span className="mr-1.5 font-bold">⚠</span>}
          {m.text}
        </div>
      ))}
    </div>
  );
}
