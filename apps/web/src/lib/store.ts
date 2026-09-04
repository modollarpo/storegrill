'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_REGION_KEY, regionByKey } from './regions';

export interface CartLine {
  productId: string;
  variantId?: string;
  name: string;
  slug?: string;
  image?: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
  quantity: number;
  stock?: number;
  vendorName?: string;
}

interface PrefsState {
  regionKey: string;
  currencyOverride: string | null;
  language: string;
}

export interface AppliedCoupon {
  code: string;
  dealName: string;
  discountMinorUnits: number;
}

interface StoreState extends PrefsState {
  cartLines: CartLine[];
  favorites: CartLine[];
  hydrated: boolean;
  appliedCoupon: AppliedCoupon | null;
  setRegion: (key: string) => void;
  setLanguage: (lang: string) => void;
  setCurrencyOverride: (code: string | null) => void;
  addToCart: (line: CartLine) => void;
  setQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  toggleFavorite: (line: CartLine) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  markHydrated: () => void;
}

function writePrefsCookie(prefs: { regionKey: string; language: string }) {
  if (typeof document === 'undefined') return;
  document.cookie = `sg_prefs=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=31536000; samesite=lax`;
}

function sameLine(a: CartLine, b: Pick<CartLine, 'productId' | 'variantId'>) {
  return a.productId === b.productId && (a.variantId || undefined) === (b.variantId || undefined);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      regionKey: DEFAULT_REGION_KEY,
      currencyOverride: null,
      language: 'en',
      cartLines: [],
      favorites: [],
      hydrated: false,
      appliedCoupon: null,

      setRegion: (key) => {
        const meta = regionByKey(key);
        const defaultLanguage = meta.languages[0]?.code ?? 'en';
        set({ regionKey: key, currencyOverride: null, language: defaultLanguage });
        writePrefsCookie({ regionKey: key, language: defaultLanguage });
      },

      setLanguage: (lang) => {
        set({ language: lang });
        writePrefsCookie({ regionKey: get().regionKey, language: lang });
      },

      setCurrencyOverride: (code) => {
        set({ currencyOverride: code });
      },

      addToCart: (line) =>
        set((state) => {
          const existing = state.cartLines.find(l => sameLine(l, line));
          if (existing) {
            return {
              cartLines: state.cartLines.map(l =>
                sameLine(l, line)
                  ? { ...l, quantity: l.quantity + Math.max(line.quantity, 1) }
                  : l
              ),
            };
          }
          return { cartLines: [...state.cartLines, { ...line }] };
        }),

      setQuantity: (productId, variantId, qty) =>
        set((state) => ({
          cartLines:
            qty <= 0
              ? state.cartLines.filter(l => !sameLine(l, { productId, variantId }))
              : state.cartLines.map(l =>
                  sameLine(l, { productId, variantId }) ? { ...l, quantity: qty } : l
                ),
        })),

      removeFromCart: (productId, variantId) =>
        set((state) => ({
          cartLines: state.cartLines.filter(l => !sameLine(l, { productId, variantId })),
        })),

      clearCart: () => set({ cartLines: [], appliedCoupon: null }),

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),

      toggleFavorite: (line) =>
        set((state) => {
          const exists = state.favorites.some(l => sameLine(l, line));
          return {
            favorites: exists
              ? state.favorites.filter(l => !sameLine(l, line))
              : [...state.favorites, { ...line }],
          };
        }),

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'Storegrill-storage',
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
        if (state) {
          writePrefsCookie({ regionKey: state.regionKey, language: state.language });
        }
      },
    }
  )
);

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotalMinor(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceMinorUnits * l.quantity, 0);
}
