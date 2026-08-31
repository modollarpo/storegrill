'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCart, CartItemLine } from '../providers/CartContext';
import { PriceDisplay } from './PriceDisplay';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { storefrontImage } from '@/lib/images';
import { cn } from '@/lib/utils';

export interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  locale?: string;
}

export function CartDrawer({ open, onClose, locale = 'en-US' }: CartDrawerProps) {
  const cart = useCart();

  return (
    <Drawer open={open} onClose={onClose} side="right" title={`Basket · ${cart.count} item${cart.count === 1 ? '' : 's'}`} className="w-[var(--drawer-width)]">
      <CartLines onNavigate={onClose} locale={locale} />
    </Drawer>
  );
}

function CartLines({ onNavigate, locale }: { onNavigate: () => void; locale: string }) {
  const cart = useCart();
  const [coupon, setCoupon] = useState('');
  const [couponState, setCouponState] = useState<'idle' | 'valid' | 'invalid'>('idle');

  if (cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-surface-sunken grid place-items-center">
          <svg className="w-12 h-12 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-text-primary">Your basket is empty</p>
          <p className="text-sm text-text-secondary mt-1">Discover amazing products and deals.</p>
        </div>
        <Button variant="primary" onClick={onNavigate} asChild>
          <Link href="/products" onClick={onNavigate}>Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto divide-y divide-border px-4">
        {cart.items.map(line => (
          <CartItemRow key={`${line.productId}-${line.variantId ?? ''}`} line={line} locale={locale} />
        ))}
      </div>

      <footer className="border-t border-border p-5 space-y-4 shrink-0 bg-surface">
        {/* Promo code */}
        <div>
          <label htmlFor="drawer-coupon" className="sr-only">Coupon code</label>
          <div className="flex gap-2">
            <input
              id="drawer-coupon"
              value={coupon}
              onChange={e => {
                setCoupon(e.target.value.toUpperCase());
                setCouponState('idle');
              }}
              placeholder="Promo code"
              className={cn(
                'input h-10 flex-1 text-sm border-border rounded-xs bg-surface-sunken focus:border-action-primary',
                couponState === 'invalid' && 'border-feedback-danger'
              )}
              aria-invalid={couponState === 'invalid'}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCouponState(/^[A-Z0-9-]{4,}$/.test(coupon) ? 'valid' : 'invalid')}
              disabled={!coupon}
            >
              Apply
            </Button>
          </div>
          {couponState === 'invalid' && (
            <p role="alert" className="text-xs text-feedback-danger font-bold mt-1.5">Enter a valid code — validated at checkout.</p>
          )}
          {couponState === 'valid' && (
            <p className="text-xs text-feedback-success font-bold mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              Code will be applied at checkout.
            </p>
          )}
        </div>

        {/* Subtotal */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-text-secondary">Subtotal</span>
          {cart.currencyCode && (
            <PriceDisplay amountMinorUnits={cart.subtotalMinorUnits} currencyCode={cart.currencyCode} size="md" locale={locale} />
          )}
        </div>
        <p className="text-xs text-text-tertiary -mt-3">Tax and delivery calculated at checkout.</p>

        {/* CTAs */}
        <Link
          href="/checkout"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full h-[52px] rounded-full bg-ember text-white font-extrabold text-base shadow-lg shadow-ember/30 hover:bg-deal hover:scale-[1.02] active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Checkout securely
        </Link>
        <Link
          href="/cart"
          onClick={onNavigate}
          className="block text-center text-sm font-bold text-text-secondary hover:text-action-primary hover:underline underline-offset-4 py-1 transition-colors"
        >
          View full basket
        </Link>
      </footer>
    </>
  );
}

export function CartItemRow({ line, locale = 'en-US' }: { line: CartItemLine; locale?: string }) {
  const { setQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 py-4" data-testid="cart-item-row">
      <Link href={`/products/${line.slug || line.productId}`} className="relative w-16 h-16 shrink-0 rounded-xs overflow-hidden border border-border bg-surface-raised">
        {line.image && <Image src={storefrontImage(line.image) || '/product-placeholder.svg'} alt="" fill sizes="64px" className="object-contain p-1.5 mix-blend-multiply" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${line.slug || line.productId}`}
          className="text-sm font-medium line-clamp-2 leading-snug text-text-primary hover:text-action-primary hover:underline underline-offset-2 transition-colors"
        >
          {line.name}
        </Link>
        {line.vendorName && <p className="text-xs text-text-tertiary mt-0.5">Sold by {line.vendorName}</p>}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div
            className="inline-flex items-center rounded-xs border border-border bg-surface-sunken overflow-hidden"
            role="group"
            aria-label={`Quantity for ${line.name}`}
          >
            <button
              type="button"
              onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-8 h-8 grid place-items-center font-bold hover:bg-surface-raised hover:text-action-primary transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-extrabold" aria-live="polite">{line.quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(line.productId, line.variantId, Math.min(line.quantity + 1, line.stock ?? 99))}
              aria-label="Increase quantity"
              className="w-8 h-8 grid place-items-center font-bold hover:bg-surface-raised hover:text-action-primary transition-colors"
            >
              +
            </button>
          </div>
          <PriceDisplay amountMinorUnits={line.unitPriceMinorUnits * line.quantity} currencyCode={line.currencyCode} size="sm" locale={locale} />
        </div>
        <button
          type="button"
          onClick={() => removeItem(line.productId, line.variantId)}
          className="text-xs font-bold text-text-tertiary hover:text-feedback-danger hover:underline underline-offset-2 mt-2 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
