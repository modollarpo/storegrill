'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  initial?: string;
  className?: string;
  tablistClassName?: string;
  panelClassName?: string;
}

export function Tabs({ items, initial, className, tablistClassName, panelClassName }: TabsProps) {
  const activeItems = items.filter(i => !i.disabled);
  const initialId = activeItems.some(i => i.id === initial)
    ? initial
    : activeItems[0]?.id;
  const [active, setActive] = useState<string | undefined>(initialId);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const index = activeItems.findIndex(i => i.id === active);

  function onKeyDown(e: React.KeyboardEvent) {
    const idx = index;
    if (idx < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (idx + dir + activeItems.length) % activeItems.length;
      setActive(activeItems[next].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(activeItems[0].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = activeItems.length - 1;
      setActive(activeItems[last].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[last]?.focus();
    }
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Product information"
        onKeyDown={onKeyDown}
        className={cn(
          'sticky top-14 z-10 -mx-6 px-6 md:-mx-8 md:px-8 rounded-t-2xl bg-surface/95 backdrop-blur-sm border-b border-smoke-150 shadow-sticky',
          tablistClassName
        )}
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {activeItems.map(item => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(item.id)}
                className={cn(
                  'relative inline-flex items-center gap-2 px-5 py-3.5 text-base font-bold whitespace-nowrap transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset rounded-t-sm',
                  selected ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}
              >
                {item.icon && <span className="shrink-0 text-text-tertiary" aria-hidden="true">{item.icon}</span>}
                {item.label}
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-xs text-[10px] font-extrabold',
                      selected ? 'bg-ember text-white' : 'bg-smoke-150 text-text-secondary'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-all duration-slow',
                    selected ? 'bg-ember' : 'bg-transparent scale-x-0'
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
      {activeItems.map(item => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className={cn('py-6 animate-fade-in', panelClassName)}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}