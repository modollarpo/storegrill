'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

interface AccordionItem {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  badge?: number | string;
  defaultOpen?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  variant?: 'default' | 'flush' | 'card';
  className?: string;
}

export function Accordion({ items, allowMultiple = false, variant = 'default', className }: AccordionProps) {
  const defaultOpen = items.filter(i => i.defaultOpen).map(i => i.id);
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen));

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={cn(
      variant === 'card' && 'space-y-2',
      variant === 'default' && 'divide-y divide-surface-200',
      className
    )}>
      {items.map(item => (
        <AccordionPanel
          key={item.id}
          item={item}
          isOpen={open.has(item.id)}
          onToggle={() => toggle(item.id)}
          variant={variant}
        />
      ))}
    </div>
  );
}

interface AccordionPanelProps {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  variant: AccordionProps['variant'];
}

function AccordionPanel({ item, isOpen, onToggle, variant }: AccordionPanelProps) {
  const panelId = useId();
  const headerId = useId();

  return (
    <div className={cn(
      variant === 'card' && 'rounded-xl border border-surface-200 bg-surface-raised overflow-hidden shadow-sm',
    )}>
      <h3>
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-between gap-3 text-left font-bold text-sm text-text-primary transition-colors',
            variant === 'card' ? 'px-5 py-4 hover:bg-surface-50' : 'py-4 hover:text-action-primary',
            variant === 'flush' && 'py-3',
          )}
        >
          <span className="flex items-center gap-2.5">
            {item.title}
            {item.badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-action-primary/10 text-action-primary text-[10px] font-black">
                {item.badge}
              </span>
            )}
          </span>
          <svg
            className={cn(
              'w-4 h-4 shrink-0 text-text-tertiary transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
        className={cn(
          'overflow-hidden transition-all',
          variant === 'card' ? 'px-5 pb-5' : 'pb-4',
        )}
      >
        {item.children}
      </div>
    </div>
  );
}
