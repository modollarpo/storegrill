'use client';

import { PAYMENT_METHOD_PROVIDER, type PaymentMethodId } from '@Storegrill/shared';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import Image from 'next/image';

export interface PaymentOption {
  id: PaymentMethodId;
  provider: 'stripe' | 'paypal' | 'cod';
  label: string;
  /** Card and wallet are settled off-site; cod is settled on delivery. */
  flow: 'redirect' | 'inline' | 'onDelivery';
  description?: string;
}

/** Only ship an icon where one exists in public/checkout. */
const ICONS: Record<string, string> = {
  card: '/checkout/bank.svg',
  paypal: '/checkout/paypal.svg',
  cod: '/checkout/cash.svg',
};

/** Wallets render their own button instead of a radio row. */
export const WALLET_PROVIDERS = new Set(['paypal']);

export function paymentFlow(id: PaymentMethodId): PaymentOption['flow'] {
  const provider = PAYMENT_METHOD_PROVIDER[id];
  if (provider === 'cod') return 'onDelivery';
  if (WALLET_PROVIDERS.has(provider)) return 'inline';
  return 'redirect';
}

export function buildPaymentOptions(
  regionPaymentMethods: readonly PaymentMethodId[],
  locale: string
): PaymentOption[] {
  return regionPaymentMethods.map(id => {
    const provider = PAYMENT_METHOD_PROVIDER[id] ?? 'stripe';
    const flow = paymentFlow(id);
    const label = t(locale, `checkoutPaymentMethod${id[0].toUpperCase()}${id.slice(1)}`);
    return {
      id,
      provider,
      flow,
      label,
      description:
        flow === 'redirect'
          ? t(locale, 'checkoutPaymentRedirectDescription', label)
          : flow === 'inline'
            ? t(locale, 'checkoutPaymentInlineDescription', label)
            : t(locale, 'checkoutPaymentCodDescription'),
    };
  });
}

export function CheckoutPaymentMethod({
  locale,
  options,
  selectedId,
  onSelect,
  amount,
  currency,
}: {
  locale: string;
  options: PaymentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  amount: number;
  currency: string;
}) {
  if (options.length === 0) {
    return (
      <div className="bg-surface-raised border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-text-primary mb-2">
          {t(locale, 'checkoutPaymentTitle')}
        </h2>
        <p role="alert" className="text-sm text-red-600">
          {t(locale, 'checkoutPaymentNoneAvailable')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">
        {t(locale, 'checkoutPaymentTitle')}
      </h2>
      <div className="space-y-3" role="radiogroup" aria-label={t(locale, 'checkoutPaymentTitle')}>
        {options.map(option => (
          <label
            key={option.id}
            data-testid={`payment-option-${option.id}`}
            className={cn(
              'flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
              selectedId === option.id ? 'border-ember bg-ember/5 shadow-sm' : 'border-border hover:border-ember'
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="w-4 h-4 mt-1 accent-ember"
              checked={selectedId === option.id}
              onChange={() => onSelect(option.id)}
            />
            {ICONS[option.id] && (
              <span className="relative w-10 h-6 shrink-0 mt-0.5">
                <Image src={ICONS[option.id]} alt="" fill className="object-contain" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-text-primary">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-text-secondary">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>

      {options.find(o => o.id === selectedId)?.flow !== 'onDelivery' && amount > 0 && (
        <p className="mt-3 text-xs text-text-secondary">
          {t(locale, 'checkoutPaymentAmountDue', `${amount} ${currency}`)}
        </p>
      )}
    </div>
  );
}
