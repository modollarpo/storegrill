'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';

export interface MegaMenuCategory {
  name: string;
  slug: string;
  children: Array<{ name: string; slug: string }>;
  featured?: Array<{ id: string; name: string; thumbnail?: string; price: number; currencyCode: string }>;
}

export interface CategoryMegaMenuProps {
  categories: MegaMenuCategory[];
  language?: string;
}

export function CategoryMegaMenu({ categories, language = 'en' }: CategoryMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function enter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), 200);
  }

  function leave() {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    const max = categories.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(max, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const active = categories[activeIndex] ?? categories[0];

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Browse all categories"
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border border-subtle rounded-full transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action-primary"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {language === 'en' ? 'All Categories' : language === 'de' ? 'Alle Kategorien' : language === 'fr' ? 'Toutes catégories' : language === 'es' ? 'Todas las categorías' : language === 'it' ? 'Tutte le categorie' : language === 'nl' ? 'Alle categorieën' : language === 'pl' ? 'Wszystkie kategorie' : language === 'pt' ? 'Todas as categorias' : language === 'ja' ? 'すべてのカテゴリー' : language === 'ar' ? 'جميع الفئات' : 'All Categories'}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-[var(--z-tooltip)] animate-fade-in"
          role="menu"
          aria-label="Category browser"
        >
          <div className="w-full max-w-[calc(100%-1rem)] rounded-lg border border-subtle bg-surface shadow-sm overflow-hidden">
            <ul role="presentation" className="w-full border-b border-subtle bg-surface/50">
              {categories.map((cat, i) => (
                <li key={cat.slug} className="border-y border-subtle/50">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    aria-expanded={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onFocus={() => setActiveIndex(i)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2 text-sm transition-colors',
                      i === activeIndex ? 'font-bold text-charcoal border-y' : 'text-smoke-600 hover:text-charcoal'
                    )}
                  >
                    <span>{cat.name}</span>
                    <svg className="w-3.5 h-3.5 text-smoke-400 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-smoke-400 mb-3">Popular right now</h3>
              <ul className="grid grid-cols-2 gap-3 rounded-sm p-3 bg-surface/50" role="presentation">
                {(active.featured || []).slice(0, 4).map(p => (
                  <li key={p.id} className="group">
                    <Link
                      href={`/products/${p.id}`}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-3 rounded-sm border border-subtle p-2 hover:bg-surface-sunset transition-colors group"
                    >
                      <span className="relative w-10 h-10 rounded-sm shrink-0 overflow-hidden bg-surface-200">
                        {p.thumbnail && <Image src={storefrontImage(p.thumbnail) || '/product-placeholder.svg'} alt="" fill sizes="40px" className="object-contain p-0.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-charcoal truncate group-hover:text-action-primary">{p.name}</span>
                        <span className="block text-[2px] font-semibold text-charcoal">{new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.price / 100)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}