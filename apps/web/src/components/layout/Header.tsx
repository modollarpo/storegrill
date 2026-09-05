'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRegion } from '../providers/RegionContext';
import { useCart } from '../providers/CartContext';
import { useWishlist } from '../providers/WishlistContext';
import { REGION_META, regionUrl } from '@/lib/regions';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { SearchBar } from '../search/SearchBar';
import { CategoryMegaMenu, type MegaMenuCategory } from '../navigation/CategoryMegaMenu';
import { CartDrawer } from '../commerce/CartDrawer';
import { Drawer } from '../ui/Drawer';
import type { CategoryNode } from '@/lib/api-client';

export interface HeaderProps {
  categories: CategoryNode[];
}

function useOutsideClick<T extends HTMLElement>(
  handler: (e: MouseEvent) => void,
  enabled = true
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler(e);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handler(e as unknown as MouseEvent);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [handler, enabled]);
  return ref;
}

function RegionPicker({
  currentKey,
  open,
  onClose,
}: {
  currentKey: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useOutsideClick<HTMLDivElement>(() => onClose());

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose your country or region"
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-20"
    >
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-[min(30rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-surface-raised rounded-md shadow-md p-5 z-10 text-text-primary">
        <h3 className="text-sm font-bold mb-1">Choose your country or region</h3>
        <p className="text-xs text-text-secondary mb-3">
          Shopping on <strong>{currentKey.toLowerCase()}.storegrill.net</strong> — local
          currency, payments and delivery.
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-2">
          {REGION_META.map(r => (
            <li key={r.key}>
              <a
                href={regionUrl(r.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-surface-sunken transition-colors',
                  r.key === currentKey && 'font-bold bg-blue-50'
                )}
              >
                <span aria-hidden="true">{r.flag}</span>
                <span className="truncate">{r.name}</span>
                <span className="ml-auto text-text-tertiary">{r.currency}</span>
              </a>
            </li>
          ))}
        </ul>
        <a
          href={regionUrl(currentKey, '/regions')}
          className="btn btn-outline btn-sm mt-3 w-full"
        >
          View all regions →
        </a>
      </div>
    </div>
  );
}

const HIDDEN_CATEGORY_SLUGS = new Set(['costway', 'uncategorised']);

function isHiddenCategory(category: { name: string; slug: string }): boolean {
  if (HIDDEN_CATEGORY_SLUGS.has(category.slug)) return true;
  if (category.name.toLowerCase() === 'makeup vanities') return true;
  if (category.slug === 'makeup-vanities' || category.slug.startsWith('makeup-vanities-')) return true;
  return false;
}

function Header({ categories }: HeaderProps) {
  const { regionKey, language, setLanguage } = useRegion();
  const cart = useCart();
  const wishlist = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [openDept, setOpenDept] = useState<string | null>(null);

  const filteredCategories = categories.filter(c => !isHiddenCategory(c));

  const megaMenuCategories: MegaMenuCategory[] = filteredCategories.map(c => ({
    name: c.name,
    slug: c.slug,
    children: c.children.map(child => ({
      name: child.name,
      slug: child.slug,
      children: (child.children || []).map(grandchild => ({ name: grandchild.name, slug: grandchild.slug })),
    })),
    featured: c.featured,
  }));

  return (
    <>
      <header
        id="masthead"
        className="site-header sticky top-0 z-[var(--z-header)]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* ——— ROW 1: TOPBAR ——— */}
        <div
          id="header-top"
          className="hidden lg:block bg-ember-deep text-white"
        >
          <div className="container-fluid">
            <div className="flex items-center justify-between h-10">
              <nav className="flex items-center gap-6">
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setRegionOpen(true); }}
                  className="text-[13px] font-medium hover:opacity-80 transition-opacity"
                >
                  {t(language, 'hello')}, {t(language, 'signIn').toLowerCase()}
                </a>
                <a href="/deals" className="text-[13px] font-medium hover:opacity-80 transition-opacity">
                  Today&apos;s Deals
                </a>
                <a href="/vendor/apply" className="text-[13px] font-medium hover:opacity-80 transition-opacity">
                  Sell on Storegrill
                </a>
              </nav>
              <nav className="flex items-center gap-6">
                <a href="/help" className="text-[13px] font-medium hover:opacity-80 transition-opacity">
                  Help
                </a>
                <a href="/track" className="text-[13px] font-medium hover:opacity-80 transition-opacity">
                  Track Order
                </a>
{REGION_META.find(r => r.key === regionKey)?.languages?.length ? (
  <select
    aria-label="Switch language"
    value={language}
    onChange={e => setLanguage(e.target.value)}
    className="bg-transparent border-none text-[13px] font-medium text-white cursor-pointer outline-none [&>option]:text-text-primary"
  >
    {(REGION_META.find(r => r.key === regionKey)?.languages || []).map(l => (
      <option key={l.code} value={l.code}>{l.nativeName}</option>
    ))}
  </select>
) : null}
              </nav>
            </div>
          </div>
        </div>

        {/* â•â•â• ROW 2: MAIN HEADER â•â•â• */}
        <div
          id="header-main"
          className="bg-ember text-white border-t border-white/20 shadow-sm"
        >
          <div className="container-fluid">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center h-[74px] gap-6">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="p-2 -ml-2 hover:opacity-80 transition-opacity text-white"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Logo */}
              <Link
                href="/"
                aria-label="Storegrill home"
                className="shrink-0 flex items-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-white.svg" alt="Storegrill" className="h-[48px] w-auto max-w-[9.5rem]" />
              </Link>

              {/* Categories dropdown + Search */}
              <div className="flex items-center flex-1 gap-3">
                <CategoryMegaMenu categories={megaMenuCategories} language={language} />

                <div className="flex-1">
                  <SearchBar regionKey={regionKey} />
                </div>
              </div>

              {/* Icons row */}
              <div className="flex items-center gap-3 shrink-0 text-white">
                <button
                  type="button"
                  onClick={() => setRegionOpen(true)}
                  className="flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                  aria-label="Select region"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Region</span>
                </button>

                <Link
                  href="/account/wishlist"
                  className="relative flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                  aria-label={`Wishlist, ${wishlist.items.length} items`}
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  {wishlist.items.length > 0 && (
                    <span className="absolute -top-0.5 right-0 min-w-[17px] h-[17px] flex items-center justify-center bg-secondary text-text-primary text-[10px] font-bold rounded-full px-1">
                      {wishlist.items.length}
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-none">Wishlist</span>
                </Link>

                <Link
                  href="/auth/signin"
                  className="flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                  aria-label="Account"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Account</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity text-white"
                  aria-label={`Open cart, ${cart.count} items`}
                  data-testid="cart-button"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {cart.count > 0 && (
                    <span className="absolute -top-0.5 right-0 min-w-[17px] h-[17px] flex items-center justify-center bg-surface-raised text-ember text-[10px] font-bold rounded-full px-1">
                      {cart.count}
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-none">Basket</span>
                </button>
              </div>
            </div>

            {/* Mobile Header: Hamburger (left) | Logo (center) | Cart (right) + Search bar below */}
            <div className="flex flex-col lg:hidden py-3 gap-2.5">
              <div className="flex items-center justify-between">
                {/* Left: Mobile hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Center: Logo */}
                <Link
                  href="/"
                  aria-label="Storegrill home"
                  className="flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-white.svg" alt="Storegrill" className="h-7 w-auto max-w-[8.5rem]" />
                </Link>

                {/* Right: Cart icon */}
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative p-2 -mr-2 text-white hover:opacity-80 transition-opacity"
                  aria-label={`Open cart, ${cart.count} items`}
                  data-testid="mobile-cart-button"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {cart.count > 0 && (
                    <span className="absolute top-1 right-0 min-w-[16px] h-[16px] flex items-center justify-center bg-secondary text-text-primary text-[9px] font-bold rounded-full px-0.5">
                      {cart.count}
                    </span>
                  )}
                </button>
              </div>

              {/* Mobile Search Bar below header */}
              <div className="w-full">
                <SearchBar regionKey={regionKey} />
              </div>
            </div>

                {/* Desktop: Wishlist + Account + Cart */}
                <div className="hidden lg:flex items-center gap-3 text-white">
                  <button
                    type="button"
                    onClick={() => setRegionOpen(true)}
                    className="flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                    aria-label="Select region"
                  >
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="text-[10px] font-medium leading-none">Region</span>
                  </button>

                  <Link
                    href="/account/wishlist"
                    className="relative flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                    aria-label={`Wishlist, ${wishlist.items.length} items`}
                  >
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    {wishlist.items.length > 0 && (
                      <span className="absolute -top-0.5 right-0 min-w-[17px] h-[17px] flex items-center justify-center bg-secondary text-text-primary text-[10px] font-bold rounded-full px-1">
                        {wishlist.items.length}
                      </span>
                    )}
                    <span className="text-[10px] font-medium leading-none">Wishlist</span>
                  </Link>

                  <Link
                    href="/auth/signin"
                    className="flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity"
                    aria-label="Account"
                  >
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-[10px] font-medium leading-none">Account</span>
                  </Link>
                </div>

                {/* Cart button */}
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative flex flex-col items-center gap-0.5 p-2 min-w-[44px] min-h-[44px] justify-center hover:opacity-80 transition-opacity text-white"
                  aria-label={`Open cart, ${cart.count} items`}
                  data-testid="cart-button"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {cart.count > 0 && (
                    <span className="absolute -top-0.5 right-0 min-w-[17px] h-[17px] flex items-center justify-center bg-surface-raised text-ember text-[10px] font-bold rounded-full px-1">
                      {cart.count}
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-none">Basket</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* â•â•â• ROW 3: BOTTOM NAVIGATION BAR â•â•â• */}
        <nav
          id="header-bottom"
          aria-label="Categories"
          className="hidden lg:block bg-ember-deep text-white"
        >
          <div className="container-fluid">
            <div className="flex items-center h-[56px] gap-4 w-full justify-between">
              {/* Left spacer for perfect centering */}
              <div className="w-[120px] shrink-0 hidden lg:block" />

              {/* Center: category links */}
              <div className="flex items-center justify-center gap-4 xl:gap-6 flex-1 overflow-x-auto scrollbar-none">
                {filteredCategories.map(cat => (
                  <a
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="text-[15px] xl:text-[16px] font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
                  >
                    {cat.name}
                  </a>
                ))}
              </div>

              {/* Right: deals link */}
              <div className="w-[120px] shrink-0 flex justify-end">
                <Link
                  href="/deals"
                  className="text-[15px] xl:text-[16px] font-semibold text-secondary hover:opacity-80 transition-opacity whitespace-nowrap"
                >
                  Today&apos;s Deal
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <RegionPicker
        currentKey={regionKey}
        open={regionOpen}
        onClose={() => setRegionOpen(false)}
      />

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        title="Browse Storegrill"
        className="!max-w-full sm:!max-w-full w-full"
      >
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="p-4 bg-surface-raised text-text-primary flex items-center justify-between sticky top-0 z-10 border-b border-border">
            <p className="text-sm font-bold">
              {t(language, 'hello')}, {t(language, 'signIn').toLowerCase()}
            </p>
            <Link href="/auth/signin" onClick={() => setMobileOpen(false)} className="btn btn-primary btn-xs">
              Sign In
            </Link>
          </div>

          <section className="py-3" aria-label="Shop by department">
            <h3 className="px-4 py-2 text-base font-bold">Shop by Department</h3>
            {filteredCategories.map(cat => {
              const expanded = openDept === cat.slug;
              return (
                <div key={cat.slug}>
                  <div className="flex items-center">
                    <Link
                      href={`/categories/${cat.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold hover:bg-surface-sunken transition-colors"
                    >
                      {cat.name}
                    </Link>
                    {(cat.children?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${cat.name}`}
                        onClick={() => setOpenDept(expanded ? null : cat.slug)}
                        className="px-3 py-2.5 text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        <svg
                          className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-180')}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="pl-5 border-l border-border ml-4 pb-1">
                      {cat.children.map(child => (
                        <div key={child.slug}>
                          <Link
                            href={`/categories/${child.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-sunken transition-colors"
                          >
                            {child.name}
                          </Link>
                          {(child.children?.length ?? 0) > 0 && (
                            <div className="pl-4">
                              {child.children.map(grandchild => (
                                <Link
                                  key={grandchild.slug}
                                  href={`/categories/${grandchild.slug}`}
                                  onClick={() => setMobileOpen(false)}
                                  className="block px-4 py-1.5 text-xs text-text-tertiary hover:bg-surface-sunken transition-colors"
                                >
                                  {grandchild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <hr className="border-border" />

          <section className="py-3" aria-label="Programs">
            <h3 className="px-4 py-2 text-base font-bold">Programs</h3>
            <Link
              href="/deals"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
            >
              Today&apos;s Deal
            </Link>
            <Link
              href="/vendors"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
            >
              Vendors
            </Link>
            <Link
              href="/vendor/apply"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
            >
              Sell on Storegrill
            </Link>
          </section>

          <hr className="border-border" />

          <section className="py-3" aria-label="Help & Settings">
            <h3 className="px-4 py-2 text-base font-bold">Help & Settings</h3>
            <Link
              href="/help"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
            >
              Help Centre
            </Link>
            <Link
              href="/track"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
            >
              Track Order
            </Link>
          </section>
        </div>
      </Drawer>
    </>
  );
}

export { Header };
export default Header;
