'use client';

import { createContext, useContext, useEffect } from 'react';
import { useStore, type AppliedCoupon } from '@/lib/store';

export interface CartItemLine {
  productId: string;
  variantId?: string;
  name: string;
  slug?: string;
  image?: string;
  unitPriceMinorUnits: number;
  listPriceMinorUnits?: number;
  currencyCode: string;
  quantity: number;
  stock?: number;
  vendorName?: string;
  categoryId?: string;
}

interface CartContextValue {
  items: CartItemLine[];
  count: number;
  subtotalMinorUnits: number;
  currencyCode: string | null;
  appliedCoupon: AppliedCoupon | null;
  addItem: (line: CartItemLine) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cartLines = useStore(s => s.cartLines);
  const hydrated = useStore(s => s.hydrated);
  const appliedCoupon = useStore(s => s.appliedCoupon);
  const addToCart = useStore(s => s.addToCart);
  const removeFromCart = useStore(s => s.removeFromCart);
  const setQuantity = useStore(s => s.setQuantity);
  const clearCart = useStore(s => s.clearCart);
  const setAppliedCoupon = useStore(s => s.setAppliedCoupon);

  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  const value: CartContextValue = {
    items: hydrated ? cartLines : [],
    count: hydrated ? cartLines.reduce((sum, l) => sum + l.quantity, 0) : 0,
    subtotalMinorUnits: hydrated ? cartLines.reduce((sum, l) => sum + l.unitPriceMinorUnits * l.quantity, 0) : 0,
    currencyCode: hydrated ? (cartLines[0]?.currencyCode ?? null) : null,
    appliedCoupon: hydrated ? appliedCoupon : null,
    addItem: addToCart,
    removeItem: removeFromCart,
    setQuantity,
    clear: clearCart,
    setAppliedCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
