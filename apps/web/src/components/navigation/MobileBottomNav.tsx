'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/providers/CartContext';
import { useWishlist } from '@/components/providers/WishlistContext';

export function MobileBottomNav({ onOpenSearch, onOpenCategories }: { onOpenSearch?: () => void; onOpenCategories?: () => void }) {
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();

  // Context-aware bottom bar based on Bevesi / mobile app pattern:
  // If we are browsing categories or search/shop results, show Home, Filter, Search, Wishlist, Account.
  // Otherwise show Store (Home), Search, Wishlist, Account, Categories.
  const isShopOrCatalog = pathname?.includes('/products') || pathname?.includes('/categories') || pathname?.includes('/search');

  if (isShopOrCatalog) {
    return (
      <nav aria-label="Mobile Bottom Navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-[var(--z-header)] bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-[60px] px-2 flex items-center justify-around">
        <Link href="/" className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname === '/' ? 'text-ember font-bold' : 'text-smoke-600'}`}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider mt-0.5">Home</span>
        </Link>

<button
          type="button"
          onClick={() => window.dispatchEvent(new Event('storegrill:open-filters'))}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-smoke-600 hover:text-ember"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider mt-0.5">Filter</span>
        </button>

        <button type="button" onClick={onOpenSearch} className="flex flex-col items-center justify-center flex-1 h-full py-1 text-smoke-600 hover:text-ember">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider mt-0.5">Search</span>
        </button>

        <Link href="/account/wishlist" className={`flex flex-col items-center justify-center flex-1 h-full relative py-1 ${pathname?.includes('/wishlist') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {wishlist.items.length > 0 && (
            <span className="absolute top-1 right-3 min-w-[15px] h-[15px] bg-action-primary text-action-primary-fg text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {wishlist.items.length}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider mt-0.5">Wishlist</span>
        </Link>

        <Link href="/account" className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname?.includes('/account') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider mt-0.5">Account</span>
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="Mobile Bottom Navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-[var(--z-header)] bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-[60px] px-2 flex items-center justify-around">
      <Link href="/products" className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname?.startsWith('/products') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
          <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7Z" />
          <path d="M9 22v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
        </svg>
        <span className="text-[10px] uppercase tracking-wider mt-0.5">Store</span>
      </Link>

      <button type="button" onClick={onOpenSearch} className="flex flex-col items-center justify-center flex-1 h-full py-1 text-smoke-600 hover:text-ember">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <span className="text-[10px] uppercase tracking-wider mt-0.5">Search</span>
      </button>

      <Link href="/account/wishlist" className={`flex flex-col items-center justify-center flex-1 h-full relative py-1 ${pathname?.includes('/wishlist') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
{wishlist.items.length > 0 && (
            <span className="absolute top-1 right-3 min-w-[15px] h-[15px] bg-action-primary text-action-primary-fg text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {wishlist.items.length}
            </span>
          )}
        <span className="text-[10px] uppercase tracking-wider mt-0.5">Wishlist</span>
      </Link>

      <Link href="/account" className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname?.includes('/account') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <span className="text-[10px] uppercase tracking-wider mt-0.5">Account</span>
      </Link>

      <button type="button" onClick={onOpenCategories} className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname?.includes('/categories') ? 'text-ember font-bold' : 'text-smoke-600'}`}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="text-[10px] uppercase tracking-wider mt-0.5">Categories</span>
      </button>
    </nav>
  );
}
