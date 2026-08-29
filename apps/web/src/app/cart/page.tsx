'use client';

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/components/providers/CartContext';
import { useRegion } from '@/components/providers/RegionContext';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { DEFAULT_REGIONS } from '@Storegrill/shared';
import { API_BASE } from '@/lib/api';
import { storefrontImage } from '@/lib/images';
import { cn } from '@/lib/utils';

const PAYMENT_LOGOS = ['VISA', 'Mastercard', 'AmEx', 'PayPal', 'Stripe', 'Klarna'] as const;

export default function CartPage() {
  const cart = useCart();
  const { regionKey } = useRegion();
  const [coupon, setCoupon] = useState('');
  const [couponState, setCouponState] = useState<'idle' | 'open' | 'checking' | 'valid' | 'invalid'>(cart.appliedCoupon ? 'valid' : 'idle');
  const [couponError, setCouponError] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'credit'>('card');

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === regionKey);
  const zone = regionConfig?.shippingZones[0];
  const currency = cart.currencyCode ?? regionConfig?.defaultCurrency ?? 'USD';

  const subtotal = cart.subtotalMinorUnits;
  const freeThreshold = zone?.freeShippingThresholdMinorUnits ?? 3500;
  const shipping = subtotal === 0 || subtotal >= freeThreshold ? 0 : (zone?.baseRateMinorUnits ?? 599);
  const taxRate = regionConfig?.taxRules[0]?.rate ?? 0;
  const discount = Math.min(cart.appliedCoupon?.discountMinorUnits ?? 0, subtotal);
  const tax = Math.round((subtotal - discount) * taxRate);
  const total = Math.max(0, subtotal - discount) + shipping + tax;
  const toFreeShipping = freeThreshold - subtotal;

  async function applyCoupon() {
    setCouponState('checking');
    setCouponError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/deals/apply-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon, regionKey, subtotalMinorUnits: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponState('invalid');
        setCouponError(data?.error?.message || 'Invalid promo code');
        return;
      }
      cart.setAppliedCoupon({
        code: data.coupon.code,
        dealName: data.coupon.dealName,
        discountMinorUnits: data.coupon.discountMinorUnits,
      });
      setCouponState('valid');
    } catch {
      setCouponState('invalid');
      setCouponError('Could not validate this code right now — please try again');
    }
  }

  function removeCoupon() {
    cart.setAppliedCoupon(null);
    setCoupon('');
    setCouponState('idle');
    setCouponError('');
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-[1460px] px-[30px] py-20 text-center" data-testid="empty-cart">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gray-100 mb-8">
          <svg className="w-14 h-14 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Your basket is empty</h1>
        <p className="text-base text-gray-500 mt-3">Looking for inspiration? Browse our latest offers.</p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/deals" className="h-12 px-8 rounded-md bg-ember text-white font-bold text-base hover:bg-ember-dark transition-colors inline-flex items-center">
            Shop Deals
          </Link>
          <Link href="/products" className="h-12 px-8 rounded-md border border-gray-300 text-gray-900 font-bold text-base hover:border-ember hover:text-ember transition-all inline-flex items-center">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto max-w-[1460px] px-[30px]">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">
          Basket
          <span className="ml-2 text-base font-medium text-gray-500">({cart.count} item{cart.count === 1 ? '' : 's'})</span>
        </h1>

        {/* Free shipping progress bar */}
        {toFreeShipping > 0 && subtotal > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center gap-4">
            <svg className="w-5 h-5 text-ember shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Add <PriceDisplay amountMinorUnits={toFreeShipping} currencyCode={currency} size="sm" /> more for <strong className="text-green-600">FREE delivery</strong>
              </p>
              <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[30px] items-start">
          {/* Cart items */}
          <section aria-label="Cart items" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4 text-center">Price</th>
                      <th className="px-6 py-4 text-center">Quantity</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cart.items.map(line => (
                      <tr key={`${line.productId}-${line.variantId ?? ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Link href={`/products/${line.slug || line.productId}`} className="relative w-16 h-16 shrink-0 rounded-xs overflow-hidden border border-gray-200 bg-white">
                              {line.image && <Image src={storefrontImage(line.image) || '/product-placeholder.svg'} alt="" fill sizes="64px" className="object-contain p-1.5 mix-blend-multiply" />}
                            </Link>
                            <Link href={`/products/${line.slug || line.productId}`} className="font-medium text-gray-900 hover:text-ember hover:underline underline-offset-2">
                              {line.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <PriceDisplay amountMinorUnits={line.unitPriceMinorUnits} currencyCode={currency} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center rounded-xs border border-gray-200 bg-gray-50 overflow-hidden mx-auto">
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(line.productId, line.variantId, line.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-8 h-8 grid place-items-center font-bold hover:bg-white hover:text-ember transition-colors"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-extrabold" aria-live="polite">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(line.productId, line.variantId, Math.min(line.quantity + 1, line.stock ?? 99))}
                              aria-label="Increase quantity"
                              className="w-8 h-8 grid place-items-center font-bold hover:bg-white hover:text-ember transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          <PriceDisplay amountMinorUnits={line.unitPriceMinorUnits * line.quantity} currencyCode={currency} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => cart.removeItem(line.productId, line.variantId)}
                            className="text-xs font-bold text-gray-400 hover:text-red-600 hover:underline underline-offset-2 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 text-right shadow-sm">
              <p className="text-sm text-gray-500">
                Subtotal ({cart.count} item{cart.count === 1 ? '' : 's'}):{' '}
                <strong className="text-xl text-gray-900 ml-2">
                  <PriceDisplay amountMinorUnits={subtotal} currencyCode={currency} size="md" />
                </strong>
              </p>
            </div>
          </section>

          {/* Order summary sidebar */}
          <aside aria-label="Order summary" data-testid="order-summary" className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm lg:sticky lg:top-28">
            {/* Payment method selector */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">How would you like to pay?</h2>
              <div className="space-y-3">
                <PayMethodOption
                  id="pay-card"
                  name="payMethod"
                  checked={payMethod === 'card'}
                  onChange={() => setPayMethod('card')}
                  title="Card / PayPal / Google Pay"
                  description="Pay in full now"
                />
                <PayMethodOption
                  id="pay-credit"
                  name="payMethod"
                  checked={payMethod === 'credit'}
                  onChange={() => setPayMethod('credit')}
                  title="Spread the cost"
                  description="Pay-in-instalments options shown at checkout, subject to eligibility"
                />
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-6">
              <dl className="space-y-3 text-sm">
                <SummaryRow label="Subtotal">
                  <PriceDisplay amountMinorUnits={subtotal} currencyCode={currency} size="sm" />
                </SummaryRow>
                {cart.appliedCoupon && discount > 0 && (
                  <SummaryRow label={`Discount (${cart.appliedCoupon.code})`}>
                    <span className="text-green-600 font-extrabold">
                      −<PriceDisplay amountMinorUnits={discount} currencyCode={currency} size="sm" />
                    </span>
                  </SummaryRow>
                )}
                <SummaryRow label="Delivery">
                  {shipping === 0
                    ? <span className="text-green-600 font-extrabold">FREE</span>
                    : <PriceDisplay amountMinorUnits={shipping} currencyCode={currency} size="sm" />
                  }
                </SummaryRow>
                <SummaryRow label={`Tax (${regionConfig?.taxRules[0]?.name ?? 'est.'} ${(taxRate * 100).toFixed(1)}%)`}>
                  <PriceDisplay amountMinorUnits={tax} currencyCode={currency} size="sm" />
                </SummaryRow>
                <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-baseline">
                  <dt className="text-xl font-extrabold text-gray-900">Total</dt>
                  <dd className="text-xl font-extrabold text-gray-900">
                    <PriceDisplay amountMinorUnits={total} currencyCode={currency} size="xl" />
                  </dd>
                </div>
              </dl>

              {subtotal >= freeThreshold && (
                <p className="text-sm text-green-600 font-extrabold mt-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  Qualifies for FREE standard delivery
                </p>
              )}

              {/* Primary CTA */}
              <div className="mt-6 space-y-3">
                <Link
                  href="/checkout"
                  className="flex items-center justify-center w-full h-13 py-3.5 bg-ember text-white font-extrabold rounded-md hover:bg-ember-dark active:bg-ember-deep transition-colors gap-2 text-base"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Checkout securely
                </Link>
                <Link
                  href="/products"
                  className="flex items-center justify-center w-full h-11 border border-gray-300 text-gray-900 font-bold rounded-md hover:border-ember hover:text-ember transition-all text-sm"
                >
                  Continue shopping
                </Link>
              </div>

              {/* Promo code */}
              <div className="mt-5 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  className="w-full text-left flex justify-between items-center text-sm font-bold text-gray-900 group"
                  onClick={() => setCouponState(s => s === 'idle' ? 'open' : 'idle')}
                >
                  Add a promo code
                  <span className={cn('text-gray-400 group-hover:text-ember transition-colors text-lg font-bold', couponState !== 'idle' && 'text-ember')}>
                    {couponState !== 'idle' ? '−' : '+'}
                  </span>
                </button>
                {couponState !== 'idle' && (
                  <div className="mt-3 space-y-2">
                    {cart.appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
                        <p className="text-xs font-bold text-green-700">
                          ✓ {cart.appliedCoupon.dealName} applied ({cart.appliedCoupon.code})
                        </p>
                        <button type="button" onClick={removeCoupon} className="text-xs font-bold text-gray-500 hover:text-red-600 underline underline-offset-2 shrink-0">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            value={coupon}
                            onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponState('open'); setCouponError(''); }}
                            placeholder="Enter promo code"
                            disabled={couponState === 'checking'}
                            className="input flex-1 h-10 text-sm border-gray-300 bg-white rounded-md focus:border-ember disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={applyCoupon}
                            disabled={!coupon.trim() || couponState === 'checking'}
                            className="h-10 px-5 shrink-0 rounded-md border border-gray-300 text-sm font-bold text-gray-900 hover:border-ember hover:text-ember transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {couponState === 'checking' ? 'Checking…' : 'Apply'}
                          </button>
                        </div>
                        {couponState === 'invalid' && (
                          <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            {couponError || 'Invalid promo code'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Payment logos */}
              <div className="border-t border-gray-200 pt-4 mt-5">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">We accept</p>
                <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
                  {PAYMENT_LOGOS.map(name => (
                    <li key={name} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-500 shadow-sm">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PayMethodOption({
  id, name, checked, onChange, title, description,
}: {
  id: string; name: string; checked: boolean; onChange: () => void; title: string; description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 p-4 border-2 rounded-md cursor-pointer transition-all',
        checked ? 'border-ember bg-ember/5 shadow-sm' : 'border-gray-200 hover:border-ember'
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        className="mt-0.5 w-4 h-4 accent-ember shrink-0"
        checked={checked}
        onChange={onChange}
      />
      <div>
        <span className="block text-sm font-extrabold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
      </div>
    </label>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{children}</dd>
    </div>
  );
}
