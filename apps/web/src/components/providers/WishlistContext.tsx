'use client';

import { createContext, useContext } from 'react';
import { useStore } from '@/lib/store';

export interface WishlistItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  has: (productId: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const favorites = useStore(s => s.favorites);
  const hydrated = useStore(s => s.hydrated);
  const toggleFavorite = useStore(s => s.toggleFavorite);

  const activeFavorites = hydrated ? favorites : [];

  const value: WishlistContextValue = {
    items: activeFavorites,
    has: (productId) => activeFavorites.some(f => f.productId === productId),
    toggle: (item) =>
      toggleFavorite({
        productId: item.productId,
        variantId: undefined,
        name: item.name,
        slug: item.slug,
        image: item.image,
        unitPriceMinorUnits: item.unitPriceMinorUnits,
        currencyCode: item.currencyCode,
        quantity: 1,
      }),
    remove: (productId) => {
      const existing = activeFavorites.find(f => f.productId === productId);
      if (existing) toggleFavorite(existing);
    },
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
