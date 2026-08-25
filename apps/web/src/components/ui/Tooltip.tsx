'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] w-max max-w-60 px-2.5 py-1.5 rounded-xs bg-charcoal text-white text-2xs font-medium shadow-md animate-fade-in pointer-events-none',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ trigger, children, align = 'left', className, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  function onDocumentClick(e: MouseEvent) {
    if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      onMouseDownCapture={() => {
        document.addEventListener('mousedown', onDocumentClick, { once: true });
      }}
    >
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open && (
        <div className={cn('absolute top-full mt-2 z-[var(--z-tooltip)] animate-fade-in', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children}
        </div>
      )}
    </div>
  );
}
