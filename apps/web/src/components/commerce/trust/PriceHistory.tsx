import { cn } from '@/lib/utils';
import { PriceDisplay } from '../PriceDisplay';

interface PriceHistoryProps {
  currentPrice: number;
  listPrice?: number | null;
  currencyCode: string;
  locale?: string;
  className?: string;
}

export function PriceHistory({ currentPrice, listPrice, currencyCode, locale, className }: PriceHistoryProps) {
  const hasDiscount = listPrice != null && listPrice > currentPrice;
  const savings = hasDiscount ? listPrice! - currentPrice : 0;
  const discountPct = hasDiscount ? Math.round((savings / listPrice!) * 100) : 0;

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <PriceDisplay amountMinorUnits={currentPrice} currencyCode={currencyCode} locale={locale} size="lg" />
      {hasDiscount && (
        <>
          <PriceDisplay amountMinorUnits={listPrice!} currencyCode={currencyCode} locale={locale} strikethrough size="sm" />
          <span className="inline-flex items-center rounded-full bg-deal text-white text-[11px] font-extrabold px-2 py-0.5">
            -{discountPct}%
          </span>
        </>
      )}
    </div>
  );
}
