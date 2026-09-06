'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'sg-recent-searches';
const MAX_RECENT = 5;

const POPULAR_TERMS = ['Electronics', 'Fashion', 'Home & garden', 'Beauty', 'Sports'];

export function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setRecents(getRecent());
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function submit(term: string) {
    const q = term.trim();
    if (!q) return;
    saveRecent(q);
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div
      className={cn('fixed inset-0 z-[var(--z-header)] lg:hidden', open ? 'block' : 'hidden')}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button type="button" aria-label="Close search" className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface shadow-2xl animate-fade-in">
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault();
            submit(query);
          }}
          className="flex items-center gap-2 px-4 py-3 border-b border-border"
        >
          <svg className="w-5 h-5 text-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search our products, brands & services…"
            autoComplete="off"
            className="flex-1 min-w-0 h-11 bg-transparent outline-none text-base text-text-primary placeholder:text-text-tertiary"
          />
          <button type="submit" className="shrink-0 h-9 px-4 rounded-pill bg-action-primary text-action-primary-fg text-sm font-bold hover:brightness-110 transition-all">
            Search
          </button>
          <button type="button" onClick={onClose} className="shrink-0 h-9 px-2 rounded-pill text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
        </form>

        {(recents.length > 0 || query.trim()) && (
          <div className="px-4 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
            {!query.trim() && recents.length > 0 && (
              <section aria-label="Recent searches">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-1">Recent</h2>
                <ul className="space-y-0.5">
                  {recents.map(term => (
                    <li key={term}>
                      <button type="button" onClick={() => submit(term)} className="flex items-center gap-3 w-full py-2 text-left text-sm text-text-primary hover:text-action-primary transition-colors">
                        <svg className="w-4 h-4 text-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-label="Popular searches">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">Popular right now</h2>
              <ul className="flex flex-wrap gap-2">
                {POPULAR_TERMS.map(term => (
                  <li key={term}>
                    <button type="button" onClick={() => submit(term)} className="px-3 py-1.5 rounded-full border border-border bg-surface-raised text-sm text-text-primary hover:border-action-primary hover:text-action-primary transition-colors">
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function getRecent(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  if (typeof localStorage === 'undefined') return;
  const next = [term, ...getRecent().filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}