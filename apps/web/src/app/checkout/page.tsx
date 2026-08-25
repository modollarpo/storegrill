'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, CartItemLine } from '@/components/providers/CartContext';
import { useRegion } from '@/components/providers/RegionContext';
import { useToast } from '@/components/feedback/Toast';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { API_BASE, api, ApiError } from '@/lib/api';
import { DEFAULT_REGIONS, PAYMENT_METHOD_PROVIDER, paymentMethodLabel, PaymentMethodId } from '@Storegrill/shared';
import { cn } from '@/lib/utils';

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
  const [shippingMethod, setShippingMethod] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [billingSame, setBillingSame] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxNotice, setSandboxNotice] = useState(false);

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
  const tax = Math.round(subtotal * (regionConfig.taxRules[0]?.rate ?? 0));
  const total = subtotal + shippingCost + tax;

  const stepValid = useMemo(() => {
    if (step === 1) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && address.street.length > 2 && address.city.length > 1 && address.zip.length > 2;
    if (step === 2) return Boolean(activePayment);
    return true;
  }, [step, email, address, activePayment]);

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
          email,
          notes: `language=${language};displayMethod=${activePayment}`,
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
        <h1 className="text-displaysm font-semibold">Nothing to check out</h1>
        <Link href="/products" className="btn btn-primary mt-4">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-6 max-w-content" data-testid="checkout">
      <ol className="flex items-center gap-2 mb-6" aria-label="Checkout progress">
        {(['Contact & Delivery', 'Payment', 'Review'] as const).map((label, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          const current = step === n;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => n < step && setStep(n)}
                disabled={n >= step}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'w-7 h-7 rounded-full text-2xs font-bold grid place-items-center border transition-colors',
                  done && 'bg-feedback-success text-white border-feedback-success cursor-pointer',
                  current && 'bg-ember text-white border-ember',
                  !done && !current && 'bg-smoke-100 text-smoke-500 border-smoke-200'
                )}
              >
                {done ? '✓' : n}
              </button>
              <span className={cn('text-xs font-semibold hidden sm:block', current ? 'text-charcoal' : 'text-smoke-500')}>{label}</span>
              {i < 2 && <span aria-hidden="true" className="w-8 h-px bg-smoke-300 mx-1" />}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-5">
          <Section title="Contact & Delivery" step={1} currentStep={step} onEdit={() => setStep(1)}>
            <div className="space-y-3.5">
              <label className="block">
                <span className="block text-xs font-semibold mb-1.5">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  aria-describedby="email-hint"
                />
                <span id="email-hint" className="sr-only">Order confirmation will be sent to this email</span>
              </label>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold mb-1.5">Shipping address</legend>
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

              <fieldset>
                <legend className="text-xs font-semibold mb-2">Shipping method</legend>
                <label className="flex items-start gap-3 p-3 rounded-md border border-smoke-200 hover:border-charcoal cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="shipping"
                    checked
                    readOnly
                    className="mt-0.5 accent-[var(--color-action-primary)]"
                  />
                  <span className="flex-1">
                    <span className="flex justify-between text-xs font-semibold">
                      <span>{zone.name} — {zone.carriers[0]}</span>
                      <span>{shippingCost === 0 ? 'FREE' : <PriceDisplay amountMinorUnits={shippingCost} currencyCode={currency} size="sm" />}</span>
                    </span>
                    <span className="block text-2xs text-smoke-500 mt-0.5">
                      Estimated delivery in {zone.estimatedDaysMin}–{zone.estimatedDaysMax} business days
                    </span>
                  </span>
                </label>
              </fieldset>

              {step === 1 && (
                <button type="button" disabled={!stepValid} onClick={() => setStep(2)} className="btn btn-primary btn-lg w-full sm:w-auto">
                  Continue to Payment
                </button>
              )}
            </div>
          </Section>

          <Section title="Payment" step={2} currentStep={step} onEdit={() => setStep(2)}>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold mb-2">Payment method for your region ({regionConfig.name})</legend>
              {methods.map(method => {
                const provider = PAYMENT_METHOD_PROVIDER[method];
                return (
                  <label
                    key={method}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                      activePayment === method ? 'border-ember bg-ember-pale' : 'border-smoke-200 hover:border-charcoal'
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={activePayment === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-[var(--color-action-primary)]"
                    />
                    <span className="flex-1 text-xs font-semibold">{paymentMethodLabel(method)}</span>
                    <span className="text-2xs uppercase text-smoke-400 font-bold">{provider}</span>
                  </label>
                );
              })}
            </fieldset>

            {activePayment !== 'cod' && PAYMENT_METHOD_PROVIDER[activePayment as PaymentMethodId] !== 'paypal' && (
              <p className="mt-3 text-2xs text-smoke-500 flex items-center gap-1.5">
                Card details are collected securely by Stripe Elements on the next screen. Storegrill never stores card numbers.
              </p>
            )}
            {PAYMENT_METHOD_PROVIDER[activePayment as PaymentMethodId] === 'paypal' && (
              <p className="mt-3 text-2xs text-smoke-500">You will be redirected to PayPal to authorize this payment.</p>
            )}

            <label className="flex items-center gap-2 mt-4 text-xs cursor-pointer">
              <input type="checkbox" checked={billingSame} onChange={e => setBillingSame(e.target.checked)} className="accent-[var(--color-action-primary)] w-3.5 h-3.5" />
              Billing address same as shipping
            </label>

            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className="btn btn-primary btn-lg w-full sm:w-auto mt-4">
                Review Order
              </button>
            )}
          </Section>

          <Section title="Review & Place Order" step={3} currentStep={step} onEdit={() => setStep(3)}>
            <div aria-live="assertive">
              {error && (
                <p role="alert" className="mb-3 rounded-md bg-feedback-danger/10 border border-feedback-danger/30 text-feedback-danger text-xs font-medium px-3 py-2.5">
                  {'\u26A0'} {error}{' '}
                  {error.includes('sign in') && (
                    <>
<Link href="/auth/signin?next=/checkout" className="underline font-bold">Sign in →</Link>
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={placeOrder}
              disabled={placing || !stepValid}
              data-testid="place-order"
              className="btn btn-primary btn-lg w-full"
              aria-busy={placing}
            >
              {placing ? (
                'Placing your order…'
              ) : (
                <>
                  Place Order ·{' '}
                  <PriceDisplay amountMinorUnits={total} currencyCode={currency} size="lg" />
                </>
              )}
            </button>
            {sandboxNotice && (
              <p className="text-2xs text-smoke-500 mt-2" role="note">
                Sandbox payment mode — no live charge will be made. Add STRIPE_SECRET_KEY or PayPal credentials to go live.
              </p>
            )}
            <p className="text-2xs text-smoke-500 mt-2">
              By placing your order you agree to Storegrill&apos;s terms and privacy notice.
            </p>
          </Section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-32 space-y-3" aria-label="Order summary">
          <h2 className="text-sm font-bold">Order Summary</h2>
          <ul className="divide-y divide-smoke-100 text-xs">
            {(cart.items as CartItemLine[]).map(line => (
              <li key={`${line.productId}-${line.variantId ?? ''}`} className="py-2 flex justify-between gap-3">
                <span className="min-w-0"><span className="font-semibold">{line.quantity} Ã—</span> <span className="truncate">{line.name}</span></span>
                <PriceDisplay amountMinorUnits={line.unitPriceMinorUnits * line.quantity} currencyCode={line.currencyCode} size="sm" />
              </li>
            ))}
          </ul>
          <dl className="space-y-1 pt-2 border-t border-smoke-150 text-xs">
            <SummaryRow label="Subtotal"><PriceDisplay amountMinorUnits={subtotal} currencyCode={currency} size="sm" /></SummaryRow>
            <SummaryRow label="Shipping">{shippingCost === 0 ? 'FREE' : <PriceDisplay amountMinorUnits={shippingCost} currencyCode={currency} size="sm" />}</SummaryRow>
            <SummaryRow label={`Tax (${regionConfig.taxRules[0]?.name})`}><PriceDisplay amountMinorUnits={tax} currencyCode={currency} size="sm" /></SummaryRow>
            <div className="pt-1.5 mt-1.5 border-t border-smoke-150 flex justify-between font-bold text-sm">
              <dt>Total</dt>
              <dd><PriceDisplay amountMinorUnits={total} currencyCode={currency} size="lg" /></dd>
            </div>
          </dl>
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
    <section className={cn('card p-5 transition-opacity', !isCurrent && 'opacity-80')} aria-current={isCurrent ? 'step' : undefined}>
      <header className="flex items-center justify-between mb-3">
        <h2 className={cn('text-sm font-bold', isCurrent ? 'text-charcoal' : 'text-smoke-500')}>{title}</h2>
        {!isCurrent && (
          <button type="button" onClick={onEdit} className="btn btn-link text-xs">Edit</button>
        )}
      </header>
      {isCurrent ? children : <p className="text-xs text-smoke-400">Completed.</p>}
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-smoke-600">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function mapPaymentError(code: string, message: string): string {
  const map: Record<string, string> = {
    CARD_DECLINED: 'Your card was declined. Try another payment method.',
    INSUFFICIENT_FUNDS: 'Insufficient funds on the selected card.',
    PAYMENT_PROVIDER_ERROR: 'The payment provider had an issue. Your data is safe — please retry.',
    VALIDATION_ERROR: 'Some details need attention. Review your information and retry.',
    OUT_OF_STOCK: 'An item just went out of stock. Adjust quantities to continue.',
  };
  return map[code] ?? message;
}
