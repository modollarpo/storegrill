'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';

export interface MegaMenuCategory {
  name: string;
  slug: string;
  children: Array<{ name: string; slug: string; children?: Array<{ name: string; slug: string }> }>;
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
  const featuredProducts = (active?.featured || []).slice(0, 4);
  const subcategories = (active?.children || []).slice(0, 12);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Browse all categories"
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap border border-border rounded-full transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action-primary"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        All Categories
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-[var(--z-tooltip)] animate-fade-in"
          role="menu"
          aria-label="Category browser"
        >
          <div className="w-[880px] max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            <div className="grid grid-cols-[220px_1fr_1fr]">
              {/* Left rail: root categories */}
              <ul role="presentation" className="py-2 border-r border-border bg-surface/60">
                {categories.map((cat, i) => (
                  <li key={cat.slug} role="presentation">
                    <Link
                      href={`/categories/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      aria-expanded={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onFocus={() => setActiveIndex(i)}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                        i === activeIndex ? 'font-bold text-charcoal bg-surface-sunken' : 'text-smoke-600 hover:text-charcoal'
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

              {/* Middle: subcategories */}
              <div className="p-4 min-w-0">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-bold text-charcoal">{active?.name}</h3>
                  <Link
                    href={`/categories/${active?.slug}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="text-xs font-semibold text-action-primary hover:underline"
                  >
                    Shop all →
                  </Link>
                </div>
                <ul role="presentation" className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {subcategories.map(child => (
                    <li key={child.slug} role="presentation">
                      <Link
                        href={`/categories/${child.slug}`}
                        onClick={() => setOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2 py-1.5 text-[13px] text-smoke-600 hover:text-action-primary hover:underline"
                      >
                        <span className="truncate font-semibold text-text-primary">{child.name}</span>
                      </Link>
                      {child.children && child.children.length > 0 && (
                        <ul role="presentation" className="space-y-0.5 pb-1.5">
                          {child.children.slice(0, 5).map(grandchild => (
                            <li key={grandchild.slug} role="presentation">
                              <Link
                                href={`/categories/${grandchild.slug}`}
                                onClick={() => setOpen(false)}
                                role="menuitem"
                                className="block py-0.5 pl-3 border-l border-border text-xs text-smoke-500 hover:text-action-primary truncate"
                              >
                                {grandchild.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: featured products */}
              <div className="border-l border-border bg-surface/40 p-4 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-smoke-400 mb-2">Popular right now</h3>
                {featuredProducts.length === 0 ? (
                  <p className="text-xs text-smoke-400">Products coming soon in this category.</p>
                ) : (
                  <ul role="presentation" className="grid grid-cols-1 gap-2">
                    {featuredProducts.map(p => (
                      <li key={p.id} role="presentation">
                        <Link
                          href={`/products/${p.id}`}
                          onClick={() => setOpen(false)}
                          role="menuitem"
                          className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-surface-sunken transition-colors group"
                        >
                          <span className="relative w-11 h-11 rounded-md shrink-0 overflow-hidden bg-surface-sunken">
                            {p.thumbnail && <Image src={storefrontImage(p.thumbnail) || '/product-placeholder.svg'} alt="" fill sizes="44px" className="object-contain p-0.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-charcoal truncate group-hover:text-action-primary">{p.name}</span>
                            <span className="block text-xs font-semibold text-charcoal">{new Intl.NumberFormat(language || 'en', { style: 'currency', currency: p.currencyCode }).format(p.price / 100)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}