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
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09 1.586.316 1.586 1.08v6.144c0 .35-.145.665-.405.904-.31.285-.726.494-1.181.702-.743.338-1.526.615-2.493.84v3.677c.001.56-.348 1.052-.895 1.22-.559.172-1.141.283-1.708.369-.49.074-.998.099-1.505.114-.833.024-1.649-.032-2.427-.173-.558-.102-1.094-.257-1.575-.52a1.206 1.206 0 01-.591-1.055v-3.532c-.992-.24-1.718-.507-2.456-.833-.614-.271-1.101-.536-1.445-.867-.318-.306-.5-.694-.5-1.115V3.848c0-.327.166-.6.436-.8.297-.22.744-.288.999-.288H12.036zM13 3a8 8 0 00-4.26 1.886M12 3v2.5M15.75 3.75H20.25M19.5 5.25v.008h.008V5.25H19.5zm-9 0v.008h.008V5.25h-.008zm0 3h.008v.008h-.008V8.25zM8.25 9.75h.008v.008H8.25V9.75zm6.75 0h.008v.008h-.008V9.75z" />
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
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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
