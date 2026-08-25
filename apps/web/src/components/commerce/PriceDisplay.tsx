import { cn } from '@/lib/utils';
import { splitPrice } from '@/lib/format';

export interface PriceDisplayProps {
  amountMinorUnits: number;
  currencyCode: string;
  locale?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strikethrough?: boolean;
  listMinorUnits?: number;
  className?: string;
}

const SIZE_CLASSES = {
  sm: { whole: 'text-sm', sup: 'text-xs' },
  md: { whole: 'text-base', sup: 'text-xs' },
  lg: { whole: 'text-lg', sup: 'text-base' },
  xl: { whole: 'text-xl', sup: 'text-lg' },
};

function priceAriaLabel(amountMinorUnits: number, currencyCode: string, locale: string): string {
  const decimals = currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2;
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'name',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amountMinorUnits / 10 ** decimals);
    return formatted;
  } catch {
    return `${amountMinorUnits / 10 ** decimals} ${currencyCode}`;
  }
}

export function PriceDisplay({
  amountMinorUnits,
  currencyCode,
  locale = 'en-US',
  size = 'md',
  strikethrough = false,
  listMinorUnits,
  className,
}: PriceDisplayProps) {
  const sizes = SIZE_CLASSES[size];
  const { symbol, whole, fraction } = splitPrice(amountMinorUnits, currencyCode);
  const hasDiscount = !!listMinorUnits && listMinorUnits > amountMinorUnits;

  if (strikethrough) {
    return (
      <span
        className={cn('text-smoke-500 line-through', className)}
        aria-label={priceAriaLabel(amountMinorUnits, currencyCode, locale)}
      >
        <span aria-hidden="true">{symbol}{whole}{fraction ? `.${fraction}` : ''}</span>
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex items-baseline text-charcoal gap-px', className)}
      role="text"
      aria-label={priceAriaLabel(amountMinorUnits, currencyCode, locale)}
    >
      <span aria-hidden="true" className={cn(sizes.sup, 'font-bold align-top mt-0.5')}>{symbol}</span>
      <span aria-hidden="true" className={cn(sizes.whole, 'font-bold leading-none tracking-tight')}>{whole}</span>
      {fraction && (
        <span aria-hidden="true" className={cn(sizes.sup, 'font-bold align-top mt-0.5')}>.{fraction}</span>
      )}
      {hasDiscount && (
        <PriceDisplay amountMinorUnits={listMinorUnits!} currencyCode={currencyCode} locale={locale} strikethrough className="ml-1.5" />
      )}
    </span>
  );
}
