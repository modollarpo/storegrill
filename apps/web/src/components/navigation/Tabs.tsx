'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  initial?: string;
  className?: string;
}

export function Tabs({ items, initial, className }: TabsProps) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  function onKeyDown(e: React.KeyboardEvent) {
    const index = items.findIndex(i => i.id === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (index + dir + items.length) % items.length;
      setActive(items[next].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    }
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Product information tabs"
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-smoke-150 overflow-x-auto scrollbar-none"
      >
        {items.map(item => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                selected
                  ? 'border-ember text-charcoal'
                  : 'border-transparent text-smoke-500 hover:text-charcoal hover:border-smoke-300'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map(item => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className="py-5 animate-fade-in"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
