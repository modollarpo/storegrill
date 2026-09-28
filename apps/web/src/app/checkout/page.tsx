'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, CartItemLine } from '@/components/providers/CartContext';
import { useRegion } from '@/components/providers/RegionContext';
import { useAnalytics } from '@/components/providers/AnalyticsProvider';
import { useToast } from '@/components/feedback/Toast';
import { api, ApiError, API_BASE, csrfHeaders, isNetworkError } from '@/lib/api';
import { t } from '@/i18n';
import {
  DEFAULT_REGIONS,
  addressIssuesByField,
  buildCheckoutPayload,
  minorToMajorUnits,
  isPaymentMethodSupported,
  validateAddress,
  type Address,
  type AddressIssueCode,
  type PaymentMethodId,
  type SavedAddress,
} from '@Storegrill/shared';
import { cn } from '@/lib/utils';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { CheckoutCoupon } from '@/components/checkout/CheckoutCoupon';
import { CheckoutShippingMethod } from '@/components/checkout/CheckoutShippingMethod';
import { CheckoutPaymentMethod, buildPaymentOptions, paymentFlow } from '@/components/checkout/CheckoutPaymentMethod';
import { CheckoutAddressFields, type AddressFormValue } from '@/components/checkout/CheckoutAddressFields';
import { CheckoutNotes } from '@/components/checkout/CheckoutNotes';

type Step = 1 | 2 | 3;

const EMPTY_ADDRESS: AddressFormValue = {
  label: 'Home',
  street: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
};

export default function CheckoutPage() {
  const cart = useCart();
  const { regionKey, language } = useRegion();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [address, setAddress] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | ''>('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountNamePrefill, setAccountNamePrefill] = useState<string | null>(null);
  const [showAddressIssues, setShowAddressIssues] = useState(false);

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === regionKey) ?? DEFAULT_REGIONS[0];
  const zone = regionConfig.shippingZones[0];
  const currency = cart.currencyCode ?? regionConfig.defaultCurrency;
  const regionCountries = useMemo(() => zone?.countries ?? [], [zone]);

  const options = useMemo(
    () =>
      buildPaymentOptions(regionConfig.paymentMethods, language).filter(o =>
        isPaymentMethodSupported(o.id)
      ),
    [regionConfig, language]
  );
  const activePayment = paymentMethod && options.some(o => o.id === paymentMethod) ? paymentMethod : options[0]?.id ?? '';
  
  const subtotal = cart.subtotalMinorUnits;
  const shippingCost =
    zone.freeShippingThresholdMinorUnits && subtotal >= zone.freeShippingThresholdMinorUnits
      ? 0
      : (zone.baseRateMinorUnits ?? 599);
  const discount = Math.min(cart.appliedCoupon?.discountMinorUnits ?? 0, subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = Math.round(discountedSubtotal * (regionConfig.taxRules[0]?.rate ?? 0));
  const total = discountedSubtotal + shippingCost + tax;
  const totalMajor = minorToMajorUnits(total, currency);

  const addressDraft = useMemo<Address>(
    () => ({
      label: address.label || 'Home',
      street: address.street.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zip: address.zip.trim(),
      country: address.country.toUpperCase(),
      isDefault: false,
    }),
    [address]
  );

  const addressValidation = useMemo(() => validateAddress(addressDraft), [addressDraft]);
  const addressIssueMap = useMemo(() => addressIssuesByField(addressValidation), [addressValidation]);
  const visibleAddressIssues = showAddressIssues ? addressIssueMap : ({} as Partial<Record<keyof Address, AddressIssueCode>>);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const applySavedAddress = useCallback((saved: SavedAddress) => {
    setAddress({
      label: saved.label || 'Home',
      street: saved.street,
      line2: saved.line2 ?? '',
      city: saved.city,
      state: saved.state ?? '',
      zip: saved.zip ?? '',
      country: saved.country,
    });
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const me = await api<{ user?: { email?: string; name?: string } }>('/api/v1/auth/me');
      const userEmail = me?.user?.email ?? null;
      setAccountEmail(userEmail);
      setAccountNamePrefill(me?.user?.name ?? null);
      if (userEmail) setEmail(current => current || userEmail);
      if (me?.user?.name) setAccountName(current => current || me.user!.name!);
      const res = await api<{ addresses?: SavedAddress[] }>('/api/v1/users/me/addresses');
      const list = res?.addresses ?? [];
      setSavedAddresses(list);
      if (list.length) {
        setSelectedAddressId(list[0].id);
        applySavedAddress(list[0]);
      }
    } catch {
      setAccountEmail(null);
    }
  }, [applySavedAddress]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (address.country) return;
    setAddress(current => ({ ...current, country: regionCountries[0] ?? 'GB' }));
  }, [address.country, regionCountries]);

  useEffect(() => {
    if (cart.items.length === 0) return;
    track({
      event: 'begin_checkout',
      value: totalMajor,
      currency,
      items: cart.items.map(i => ({
        item_id: i.variantId || i.productId,
        item_name: i.name,
        price: minorToMajorUnits(i.unitPriceMinorUnits, i.currencyCode),
        quantity: i.quantity,
        currency: i.currencyCode,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepValid = useMemo(() => {
    if (step === 1) {
      if (!emailValid || !addressValidation.ok) return false;
      if (createAccount && (!accountName || accountPassword.length < 8)) return false;
      return true;
    }
    if (step === 2) return Boolean(activePayment);
    return true;
  }, [step, emailValid, addressValidation.ok, activePayment, createAccount, accountName, accountPassword]);

  async function persistAddressToAccount(draft: Address) {
    try {
      await api('/api/v1/users/me/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...draft, isDefault: false }),
      });
    } catch {
      // A failed convenience save must never fail the order.
    }
  }

  async function applyCoupon(code: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/deals/apply-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await csrfHeaders()) },
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
        toast({ variant: 'error', title: t(language, 'checkoutCouponInvalid'), description: data?.error?.message });
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
    setShowAddressIssues(true);
    if (!addressValidation.ok) {
      setStep(1);
      setPlacing(false);
      return;
    }
    try {
      for (const line of cart.items as CartItemLine[]) {
        await api('/api/v1/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: line.productId, variantId: line.variantId, quantity: line.quantity }),
        });
      }

      const selected = options.find(o => o.id === activePayment);
      const flow = selected?.flow ?? paymentFlow(activePayment as PaymentMethodId);

      const result = await api<{
        order?: { id?: string; orderNumber?: string };
        id?: string;
        orderNumber?: string;
        payment?: { redirectUrl?: string | null; mode?: 'live' | 'sandbox' } | null;
      }>('/api/v1/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(
          buildCheckoutPayload({
            address: addressDraft,
            paymentMethod: activePayment,
            regionKey,
            language,
            email,
            createAccount,
            accountName,
            accountPassword,
            saveAddress,
            notes,
            couponCode: cart.appliedCoupon?.code,
          })
        ),
      });

      if (result.payment?.redirectUrl) {
        cart.clear();
        if (flow === 'inline') {
          window.open(result.payment.redirectUrl, '_blank', 'noopener,noreferrer');
          setPlacing(false);
          return;
        }
        window.location.assign(result.payment.redirectUrl);
        return;
      }
      setSandbox(result.payment?.mode === 'sandbox');

      const orderNumber = result.order?.orderNumber || result.orderNumber || result.id || '';

      if (accountEmail && saveAddress) {
        await persistAddressToAccount(addressDraft);
      }

      await new Promise<void>(resolve => {
        track({
          event: 'purchase',
          transaction_id: orderNumber,
          value: totalMajor,
          currency,
          items: cart.items.map(i => ({
            item_id: i.variantId || i.productId,
            item_name: i.name,
            price: minorToMajorUnits(i.unitPriceMinorUnits, i.currencyCode),
            quantity: i.quantity,
            currency: i.currencyCode,
          })),
        }, resolve);
      });
      cart.clear();
      router.push(`/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`);
    } catch (e) {
      const message = checkoutErrorMessage(language, e);
      if (!(e instanceof ApiError)) {
        // A non-API failure is the class of bug that produced an undiagnosable
        // "something went wrong" for shoppers and no clue for us. Keep the
        // original error in the console so the cause is recoverable.
        console.error('[checkout] order failed', e);
      }
      setError(message);
      toast({
        variant: 'error',
        title: t(language, 'checkoutReviewStep'),
        description: message,
      });
    } finally {
      setPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-site py-16 text-center">
        <h1 className="text-3xl font-extrabold text-text-primary">{t(language, 'checkoutNothingToCheckOut')}</h1>
        <Link href="/products" className="btn btn-primary mt-4">{t(language, 'checkoutBrowseProducts')}</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-6 md:py-10" data-testid="checkout">
        <h1 className="text-2xl font-extrabold text-text-primary mb-6">{t(language, 'checkoutTitle')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[30px] items-start">
        <div className="space-y-5">
          <Section title={t(language, 'checkoutContactDelivery')} step={1} currentStep={step} language={language} onEdit={() => setStep(1)}>
            <div className="space-y-3.5">
              <label className="block">
                <span className="block text-xs font-semibold mb-1.5 text-text-primary">{t(language, 'checkoutEmail')}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={showAddressIssues && !emailValid}
                  className="input"
                />
                {showAddressIssues && !emailValid && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                    {t(language, 'checkoutErrorEmail')}
                  </p>
                )}
              </label>

              <div className="mt-3 p-3 bg-surface-raised rounded-lg border border-border">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={e => setCreateAccount(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{t(language, 'checkoutCreateAccount')}</span>
                    <p className="text-xs text-text-secondary mt-0.5">{t(language, 'checkoutCreateAccountBody')}</p>
                  </div>
                </label>
                {createAccount && (
                  <div className="mt-3 space-y-2.5 pl-6">
                    <label className="block">
                      <span className="block text-xs font-semibold mb-1 text-text-primary">{t(language, 'checkoutCreateAccountName')}</span>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        placeholder={accountNamePrefill ?? t(language, 'checkoutFullName')}
                        className="input"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold mb-1 text-text-primary">{t(language, 'checkoutCreateAccountPassword')}</span>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={8}
                        value={accountPassword}
                        onChange={e => setAccountPassword(e.target.value)}
                        placeholder={t(language, 'checkoutPasswordHint')}
                        className="input"
                      />
                    </label>
                  </div>
                )}
              </div>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold mb-1.5 text-text-primary">
                  {t(language, 'checkoutShippingAddress')}
                </legend>

                {accountEmail && savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="block text-xs font-semibold mb-1.5 text-text-primary">
                        {t(language, 'checkoutUseSavedAddress')}
                      </span>
                      <select
                        value={selectedAddressId}
                        onChange={e => {
                          const id = e.target.value;
                          setSelectedAddressId(id);
                          const found = savedAddresses.find(a => a.id === id);
                          if (found) applySavedAddress(found);
                        }}
                        className="input"
                      >
                        <option value="">{t(language, 'checkoutNewAddress')}</option>
                        {savedAddresses.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.label} — {a.street}, {a.city}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <CheckoutAddressFields
                  locale={language}
                  value={address}
                  countries={regionCountries}
                  issues={visibleAddressIssues}
                  onChange={next => {
                    setAddress(next);
                    setSelectedAddressId('');
                  }}
                />

                {accountEmail && (
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={e => setSaveAddress(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-primary">
                      {t(language, 'checkoutSaveAddress')}
                    </span>
                  </label>
                )}
              </fieldset>

              {step === 1 && (
                <button
                  type="button"
                  aria-disabled={!stepValid}
                  onClick={() => {
                    setShowAddressIssues(true);
                    if (stepValid) setStep(2);
                  }}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  {t(language, 'checkoutContinueToPayment')}
                </button>
              )}
            </div>
          </Section>

          <Section title={t(language, 'checkoutPaymentStep')} step={2} currentStep={step} language={language} onEdit={() => setStep(2)}>
            <CheckoutPaymentMethod
              locale={language}
              options={options}
              selectedId={activePayment}
              onSelect={setPaymentMethod}
              amount={totalMajor}
              currency={currency}
            />
            {sandbox && (
              <p className="mt-3 text-xs text-text-secondary">{t(language, 'checkoutSandboxNotice')}</p>
            )}
            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className="btn btn-primary w-full sm:w-auto mt-4">
                {t(language, 'checkoutReviewOrder')}
              </button>
            )}
          </Section>

          <Section title={t(language, 'checkoutReviewStep')} step={3} currentStep={step} language={language} onEdit={() => setStep(3)}>
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
              {placing ? t(language, 'checkoutPlacing') : t(language, 'checkoutPlaceOrder')}
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
            <CheckoutCoupon 
              onApply={applyCoupon}
              appliedCode={cart.appliedCoupon?.code}
              appliedName={cart.appliedCoupon?.dealName}
              onRemove={() => cart.setAppliedCoupon(null)}
            />
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
  language,
  onEdit,
  children,
}: {
  title: string;
  step: Step;
  currentStep: Step;
  language: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const isCurrent = currentStep === step;
  return (
    <section className={cn('card p-5 bg-surface-raised border border-border rounded-lg shadow-sm', !isCurrent && 'opacity-60')}>
      <header className="flex items-center justify-between mb-3">
        <h2 className={cn('text-sm font-bold', isCurrent ? 'text-text-primary' : 'text-text-secondary')}>{title}</h2>
        {currentStep > step && (
          <button type="button" onClick={onEdit} className="btn btn-link text-xs">
            {t(language, 'checkoutEdit')}
          </button>
        )}
      </header>
      {isCurrent ? children : null}
    </section>
  );
}

function mapPaymentError(locale: string, code: string, message: string): string {
  const map: Record<string, string> = {
    CARD_DECLINED: 'checkoutErrorCardDeclined',
    INSUFFICIENT_FUNDS: 'checkoutErrorInsufficientFunds',
    PAYMENT_PROVIDER_ERROR: 'checkoutErrorProvider',
    VALIDATION_ERROR: 'checkoutErrorValidation',
    OUT_OF_STOCK: 'checkoutErrorOutOfStock',
    EMPTY_CART: 'checkoutErrorEmptyCart',
    INVALID_ADDRESS: 'checkoutErrorAddress',
    PAYMENT_METHOD_UNAVAILABLE: 'checkoutErrorPaymentUnavailable',
  };
  const key = map[code];
  return key ? t(locale, key) : message;
}

/**
 * Turns a checkout failure into shopper-facing text.
 *
 * A transport failure is called out separately from a rejected order: the
 * shopper did nothing wrong in the first case and retrying is the sensible
 * next step, whereas the second may need an input change.
 */
export function checkoutErrorMessage(locale: string, error: unknown): string {
  if (isNetworkError(error)) return t(locale, 'checkoutErrorUnreachable');
  if (error instanceof ApiError) return mapPaymentError(locale, error.code, error.message);
  return t(locale, 'checkoutGenericError');
}
