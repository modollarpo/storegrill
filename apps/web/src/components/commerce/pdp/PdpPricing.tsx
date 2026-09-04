import { PriceDisplay } from '../PriceDisplay';

interface PdpPricingProps {
  activeUnitPrice: number;
  currency: string;
  listPrice?: number;
  discountPct: number;
  fromMinorUnits?: number;
  toMinorUnits?: number;
  locale?: string;
  formatMoney: (amount: number, currency: string) => string;
}

export function PdpPricing({ activeUnitPrice, currency, listPrice, discountPct, fromMinorUnits, toMinorUnits, locale = 'en-US', formatMoney }: PdpPricingProps) {
  return (
    <div className="flex items-baseline gap-3 mb-6 flex-wrap">
      {fromMinorUnits !== undefined && toMinorUnits !== undefined ? (
        <>
          <span className="text-3xl md:text-5xl font-black text-text-primary tracking-tight">
            {formatMoney(fromMinorUnits, currency)}–{formatMoney(toMinorUnits, currency)}
          </span>
          {discountPct > 0 && listPrice && (
            <span className="text-base md:text-lg text-text-tertiary line-through">
              {formatMoney(listPrice, currency)}
            </span>
          )}
          <span className="w-full text-sm font-semibold text-text-secondary">Select your style to see the exact price</span>
        </>
      ) : (
        <>
          <span className="text-3xl md:text-5xl font-black text-text-primary tracking-tight">
            <PriceDisplay amountMinorUnits={activeUnitPrice} currencyCode={currency} size="xl" locale={locale} />
          </span>
          {discountPct > 0 && listPrice && (
            <span className="text-base md:text-lg text-text-tertiary line-through">
              {formatMoney(listPrice, currency)}
            </span>
          )}
        </>
      )}
    </div>
  );
}
