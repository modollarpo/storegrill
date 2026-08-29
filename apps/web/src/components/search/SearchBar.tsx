'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API_BASE } from '@/lib/api';
import { PriceDisplay } from '../commerce/PriceDisplay';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';

const RECENT_KEY = 'sg-recent-searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 120;

interface Suggestion {
  type: 'product';
  id: string;
  name: string;
  slug?: string;
  thumbnail?: string;
  price: number;
  currencyCode: string;
  category?: string;
  rating?: number;
}

interface RecentItem {
  type: 'recent';
  term: string;
}

type SuggestionRow = Suggestion | RecentItem | { type: 'query'; term: string };

export interface SearchBarProps {
  regionKey: string;
  placeholder?: string;
}

export function SearchBar({ regionKey, placeholder = 'Search our products, brands & services ....' }: SearchBarProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<SuggestionRow[]>(() => {
    const list: SuggestionRow[] = [];
    if (!query.trim()) {
      recentSearches.forEach(term => list.push({ type: 'recent', term }));
    }
    suggestions.forEach(s => list.push(s));
    if (query.trim()) list.push({ type: 'query', term: query.trim() });
    return list;
  }, [query, recentSearches, suggestions]);

  useEffect(() => {
    setRecentSearches(getRecent());
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/products?regionKey=${regionKey}&q=${encodeURIComponent(query.trim())}&limit=5`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(
            (data.products || []).slice(0, 6).map((p: Record<string, unknown>) => ({
              type: 'product' as const,
              id: String(p.id),
              name: String(p.name),
              slug: p.slug ? String(p.slug) : undefined,
              thumbnail: (p.thumbnail as string) || undefined,
              price: Number(p.price),
              currencyCode: String(p.currencyCode || 'USD'),
              category: (p.category as { name?: string })?.name,
              rating: p.rating ? Number(p.rating) : undefined,
            }))
          );
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, regionKey]);

  const close = useCallback(() => {
    setExpanded(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [close]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setExpanded(true);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  function go(term: string) {
    if (!term.trim()) return;
    saveRecent(term.trim());
    close();
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(-1, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && rows[activeIndex]) {
        const row = rows[activeIndex];
        if (row.type === 'product') {
          saveRecent(row.name.split(' ').slice(0, 3).join(' '));
          close();
          router.push(`/products/${row.slug || row.id}`);
        } else {
          go(row.term);
        }
      } else {
        go(query);
      }
    }
  }

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0 mx-1 md:mx-3 max-w-xl">
      {expanded && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 max-md:hidden animate-fade-in" aria-hidden="true" onClick={close} />
      )}
      <form
        role="search"
        onSubmit={e => {
          e.preventDefault();
          go(query);
        }}
        className={cn(
          'flex items-center rounded-xl overflow-hidden transition-all duration-fast border',
          expanded ? 'border-action-primary shadow-md bg-surface relative z-10' : 'border-border bg-surface hover:border-action-primary'
        )}
      >
        <label htmlFor="sg-search" className="sr-only">{placeholder}</label>
        <input
          ref={inputRef}
          id="sg-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={rows.length > 0}
          aria-controls="sg-search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `sg-suggestion-${activeIndex}` : undefined}
          className="flex-1 min-w-0 rounded-lg px-4 h-11 text-sm font-medium text-text-primary placeholder:text-text-tertiary outline-none bg-surface/50 transition-colors"
        />
        <VoiceButton onResult={setQuery} />
        <div className="pr-1.5 shrink-0 flex items-center">
          <button
            type="submit"
            aria-label="Search"
            className="w-9 h-9 rounded-full grid place-items-center bg-action-primary text-action-primary-fg hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-action-primary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        </div>
      </form>

      {expanded && (rows.length > 0 || loading) && (
        <ul
          id="sg-search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-2 z-[60] bg-surface rounded-lg shadow-xl border border-border overflow-hidden py-1.5 animate-fade-in max-h-[70vh] overflow-y-auto"
        >
          {/* Loading skeletons */}
          {loading && query.trim() && (
            <>
              <li className="px-4 pt-2 pb-1 text-2xs font-bold uppercase tracking-wide text-text-tertiary" role="presentation">
                Searching…
              </li>
              {[...Array(3)].map((_, i) => (
                <li key={i} className="px-4 py-2 flex items-center gap-3" role="presentation" aria-hidden="true">
                  <div className="w-9 h-9 rounded-xs bg-surface-raised animate-shimmer bg-shimmer bg-[length:200%_100%] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-surface-raised animate-shimmer bg-shimmer bg-[length:200%_100%] rounded w-3/4" />
                    <div className="h-2.5 bg-surface-raised animate-shimmer bg-shimmer bg-[length:200%_100%] rounded w-1/3" />
                  </div>
                </li>
              ))}
            </>
          )}

          {/* Recent searches header */}
          {!query.trim() && rows.some(r => r.type === 'recent') && (
            <GroupLabel>Recent searches</GroupLabel>
          )}

          {/* Suggestion rows */}
          {!loading && rows.map((row, i) => {
            const key =
              row.type === 'product' ? row.id : row.type === 'recent' ? `recent-${row.term}` : `query-${row.term}`;
            const active = i === activeIndex;
            return (
              <li
                key={key}
                id={`sg-suggestion-${i}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  if (row.type === 'product') {
                    close();
                    router.push(`/products/${row.slug || row.id}`);
                  } else {
                    go(row.term);
                  }
                }}
                className={cn('px-4 py-2 rounded transition-colors duration-fast', active ? 'bg-surface-sunset' : 'hover:bg-surface-sunset')}
              >
                {row.type === 'product' ? (
                  <span className="flex items-center gap-4 group">
                    <span className="relative w-12 h-12 rounded-sm border border-border shrink-0 overflow-hidden bg-surface-raised">
                      {row.thumbnail && <Image src={storefrontImage(row.thumbnail) || '/product-placeholder.svg'} alt="" fill sizes="48px" className="object-contain p-1" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 mb-1">
                        <span className="block text-sm text-text-primary font-medium truncate">{row.name}</span>
                        {row.rating && row.rating >= 4.5 && (
                          <span className="inline-flex items-center gap-1 shrink-0 bg-feedback-warning-bg text-feedback-warning text-2xs font-bold px-1.5 py-0.5 rounded-full">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            Top rated
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {row.category && (
                          <span className="text-xs text-text-secondary truncate">{row.category}</span>
                        )}
                        <PriceDisplay amountMinorUnits={row.price} currencyCode={row.currencyCode} size="sm" />
                      </span>
                    </span>
                    <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-text-link font-bold">
                      View →
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <span className="text-sm text-text-primary truncate">
                      {row.type === 'recent' ? row.term : <>Search for &ldquo;<strong>{row.term}</strong>&rdquo;</>}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <li className="px-4 pt-3 pb-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary select-none" role="presentation">{children}</li>;
}

function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSupported(true);
    }
  }, []);

  if (!supported) return null;

  function toggle() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = navigator.language;
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Search by voice"
      aria-pressed={listening}
      className={cn('w-9 h-10 grid place-items-center text-text-tertiary hover:text-action-primary transition-colors shrink-0', listening && 'text-action-primary')}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
}

interface SpeechRecognitionLike {
  lang: string;
  start(): void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechResultEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
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
