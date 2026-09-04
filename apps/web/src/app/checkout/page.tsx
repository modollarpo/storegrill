'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, CartItemLine } from '@/components/providers/CartContext';
import { useRegion } from '@/components/providers/RegionContext';
import { useToast } from '@/components/feedback/Toast';
import { api, ApiError, API_BASE } from '@/lib/api';
import { DEFAULT_REGIONS, PAYMENT_METHOD_PROVIDER, PaymentMethodId } from '@Storegrill/shared';
import { cn } from '@/lib/utils';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { CheckoutCoupon } from '@/components/checkout/CheckoutCoupon';
import { CheckoutShippingMethod } from '@/components/checkout/CheckoutShippingMethod';
import { CheckoutPaymentMethod } from '@/components/checkout/CheckoutPaymentMethod';
import { CheckoutNotes } from '@/components/checkout/CheckoutNotes';

type Step = 1 | 2 | 3;

interface AddressForm {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_ADDRESS: AddressForm = { street: '', city: '', state: '', zip: '', country: 'GB' };

const SHIPPING_COUNTRIES: string[] = Array.from(
  new Set(DEFAULT_REGIONS.flatMap(region => region.shippingZones[0]?.countries ?? []))
).sort();

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

export default function CheckoutPage() {
  const cart = useCart();
  const { regionKey, language } = useRegion();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSandboxNotice] = useState(false);

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === regionKey) ?? DEFAULT_REGIONS[0];
  const zone = regionConfig.shippingZones[0];
  const currency = cart.currencyCode ?? regionConfig.defaultCurrency;

  const methods = regionConfig.paymentMethods;
  const activePayment = paymentMethod || methods[0];

  const subtotal = cart.subtotalMinorUnits;
  const shippingCost =
    zone.freeShippingThresholdMinorUnits && subtotal >= zone.freeShippingThresholdMinorUnits
      ? 0
      : (zone.baseRateMinorUnits ?? 599) + (zone.perKgRateMinorUnits ? 0 : 0);
  const discount = Math.min(cart.appliedCoupon?.discountMinorUnits ?? 0, subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = Math.round(discountedSubtotal * (regionConfig.taxRules[0]?.rate ?? 0));
  const total = discountedSubtotal + shippingCost + tax;

  const stepValid = useMemo(() => {
    if (step === 1) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && address.street.length > 2 && address.city.length > 1 && address.zip.length > 2;
    if (step === 2) return Boolean(activePayment);
    return true;
  }, [step, email, address, activePayment]);

  async function applyCoupon(code: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/deals/apply-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          regionKey,
          subtotalMinorUnits: subtotal,
          items: cart.items.map(i => ({
            productId: i.productId,
            categoryId: i.categoryId,
            quantity: i.quantity,
            unitMinorUnits: i.unitPriceMinorUnits,
            currencyCode: i.currencyCode,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        cart.setAppliedCoupon(null);
        toast({ variant: 'error', title: 'Invalid code', description: data?.error?.message });
        return;
      }
      cart.setAppliedCoupon({
        code: data.coupon.code,
        dealName: data.coupon.dealName,
        discountMinorUnits: data.coupon.discountMinorUnits,
      });
    } catch {
      cart.setAppliedCoupon(null);
    }
  }

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      for (const line of cart.items as CartItemLine[]) {
        await api('/api/v1/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: line.productId, variantId: line.variantId, quantity: line.quantity }),
        });
      }

      const result = await api<{
        order?: { id?: string; orderNumber?: string };
        id?: string;
        orderNumber?: string;
        payment?: { redirectUrl?: string | null; mode?: 'live' | 'sandbox' } | null;
      }>('/api/v1/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: {
            street: address.street,
            city: address.city,
            state: address.state || address.city,
            zip: address.zip,
            country: address.country.slice(0, 2).toUpperCase(),
          },
          paymentMethod: activePayment === 'cod' ? 'cod' : PAYMENT_METHOD_PROVIDER[activePayment as PaymentMethodId] === 'paypal' ? 'paypal' : 'stripe',
          regionKey,
          couponCode: cart.appliedCoupon?.code,
          email,
          notes: `language=${language};displayMethod=${activePayment};notes=${notes}`,
        }),
      });

      if (result.payment?.redirectUrl) {
        cart.clear();
        window.location.assign(result.payment.redirectUrl);
        return;
      }
      setSandboxNotice(result.payment?.mode === 'sandbox');

      const orderNumber = result.order?.orderNumber || result.orderNumber || result.id || '';
      cart.clear();
      router.push(`/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Please sign in to complete your order.');
      } else if (e instanceof ApiError) {
        setError(mapPaymentError(e.code, e.message));
      } else {
        setError('Something went wrong placing your order. Please try again.');
      }
      toast({ variant: 'error', title: 'Order failed', description: error ?? undefined });
    } finally {
      setPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-site py-16 text-center">
        <h1 className="text-3xl font-extrabold text-text-primary">Nothing to check out</h1>
        <Link href="/products" className="btn btn-primary mt-4">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-6 md:py-10" data-testid="checkout">
      <h1 className="text-2xl font-extrabold text-text-primary mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[30px] items-start">
        <div className="space-y-5">
          <Section title="Contact & Delivery" step={1} currentStep={step} onEdit={() => setStep(1)}>
            <div className="space-y-3.5">
              <label className="block">
                <span className="block text-xs font-semibold mb-1.5 text-text-primary">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </label>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold mb-1.5 text-text-primary">Shipping address</legend>
                <input
                  required
                  autoComplete="address-line1"
                  value={address.street}
                  onChange={e => setAddress(a => ({ ...a, street: e.target.value }))}
                  placeholder="Street address"
                  className="input"
                />
                <input
                  autoComplete="address-line2"
                  value={address.state}
                  onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                  placeholder="Apartment, suite (optional)"
                  className="input"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    required
                    autoComplete="address-level2"
                    value={address.city}
                    onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                    placeholder="City"
                    className="input col-span-2"
                  />
                  <input
                    required
                    autoComplete="postal-code"
                    value={address.zip}
                    onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                    placeholder="ZIP / Postcode"
                    className="input"
                  />
                </div>
                <select
                  required
                  autoComplete="country-name"
                  aria-label="Country"
                  value={address.country}
                  onChange={e => setAddress(a => ({ ...a, country: e.target.value }))}
                  className="input"
                >
                  {SHIPPING_COUNTRIES.map(code => (
                    <option key={code} value={code}>{countryName(code)}</option>
                  ))}
                </select>
              </fieldset>
              
              {step === 1 && (
                <button type="button" disabled={!stepValid} onClick={() => setStep(2)} className="btn btn-primary w-full sm:w-auto">
                  Continue to Payment
                </button>
              )}
            </div>
          </Section>

          <Section title="Payment" step={2} currentStep={step} onEdit={() => setStep(2)}>
            <CheckoutPaymentMethod selectedId={activePayment} onSelect={setPaymentMethod} />
            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className="btn btn-primary w-full sm:w-auto mt-4">
                Review Order
              </button>
            )}
          </Section>

          <Section title="Review & Place Order" step={3} currentStep={step} onEdit={() => setStep(3)}>
            <div aria-live="assertive">
              {error && (
                <p role="alert" className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-3 py-2.5">
                  {'\u26A0'} {error}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={placeOrder}
              disabled={placing || !stepValid}
              data-testid="place-order"
              className="btn btn-primary w-full"
            >
              {placing ? 'Placing your order…' : 'Place Order'}
            </button>
          </Section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28">
            <CheckoutOrderSummary 
                items={(cart.items as CartItemLine[]).map(i => ({id: i.productId+i.variantId, name: i.name, quantity: i.quantity, unitPriceMinorUnits: i.unitPriceMinorUnits, currencyCode: i.currencyCode, thumbnail: i.image}))}
                subtotal={subtotal} 
                currency={currency}
                discount={discount}
                shipping={shippingCost}
                tax={tax}
                total={total}
                couponCode={cart.appliedCoupon?.code}
            />
            <CheckoutCoupon onApply={applyCoupon} />
            <CheckoutShippingMethod 
                methods={[{id: 'std', name: 'Standard', description: `${zone.estimatedDaysMin}-${zone.estimatedDaysMax} business days`, priceMinorUnits: shippingCost, currencyCode: currency}]}
                selectedId="std"
                onSelect={() => {}}
            />
            <CheckoutNotes value={notes} onChange={setNotes} />
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  step,
  currentStep,
  onEdit,
  children,
}: {
  title: string;
  step: Step;
  currentStep: Step;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const isCurrent = currentStep === step;
  return (
    <section className={cn('card p-5 bg-surface-raised border border-border rounded-lg shadow-sm', !isCurrent && 'opacity-60')}>
      <header className="flex items-center justify-between mb-3">
        <h2 className={cn('text-sm font-bold', isCurrent ? 'text-text-primary' : 'text-text-secondary')}>{title}</h2>
        {currentStep > step && (
          <button type="button" onClick={onEdit} className="btn btn-link text-xs">Edit</button>
        )}
      </header>
      {isCurrent ? children : null}
    </section>
  );
}

function mapPaymentError(code: string, message: string): string {
  const map: Record<string, string> = {
    CARD_DECLINED: 'Your card was declined. Try another payment method.',
    INSUFFICIENT_FUNDS: 'Insufficient funds on the selected card.',
    PAYMENT_PROVIDER_ERROR: 'The payment provider had an issue. Please retry.',
    VALIDATION_ERROR: 'Some details need attention.',
    OUT_OF_STOCK: 'An item just went out of stock.',
  };
  return map[code] ?? message;
}
