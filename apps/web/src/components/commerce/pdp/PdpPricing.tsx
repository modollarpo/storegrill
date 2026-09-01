import { PriceDisplay } from '../PriceDisplay';

interface PdpPricingProps {
  activeUnitPrice: number;
  currency: string;
  listPrice?: number;
  discountPct: number;
  locale?: string;
  formatMoney: (amount: number, currency: string) => string;
}

export function PdpPricing({ activeUnitPrice, currency, listPrice, discountPct, locale = 'en-US', formatMoney }: PdpPricingProps) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <span className="text-5xl font-black text-text-primary tracking-tight">
        <PriceDisplay amountMinorUnits={activeUnitPrice} currencyCode={currency} size="xl" locale={locale} />
      </span>
      {discountPct > 0 && listPrice && (
        <span className="text-lg text-text-tertiary line-through">
          {formatMoney(listPrice, currency)}
        </span>
      )}
    </div>
  );
}
