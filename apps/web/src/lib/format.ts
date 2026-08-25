const NATIVE_ENGLISH_LOCALES: Record<string, string> = {
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'en-IE',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

export function currencyLocale(currencyCode: string): string {
  return NATIVE_ENGLISH_LOCALES[currencyCode] ?? 'en-GB';
}

export function currencyDecimals(currencyCode: string): number {
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'ISK']);
  return zeroDecimal.has(currencyCode) ? 0 : 2;
}

export function toDecimal(amountMinorUnits: number, currencyCode: string): number {
  return amountMinorUnits / 10 ** currencyDecimals(currencyCode);
}

export function formatPrice(amountMinorUnits: number, currencyCode: string, _locale?: string): string {
  void _locale;
  try {
    return new Intl.NumberFormat(currencyLocale(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyDecimals(currencyCode),
      maximumFractionDigits: currencyDecimals(currencyCode),
    }).format(toDecimal(amountMinorUnits, currencyCode));
  } catch {
    return `${currencyCode} ${toDecimal(amountMinorUnits, currencyCode).toFixed(2)}`;
  }
}

export function splitPrice(amountMinorUnits: number, currencyCode: string): { symbol: string; whole: string; fraction: string } {
  const decimals = currencyDecimals(currencyCode);
  try {
    const parts = new Intl.NumberFormat(currencyLocale(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).formatToParts(toDecimal(amountMinorUnits, currencyCode));
    const symbol = parts.find(p => p.type === 'currency')?.value || '$';
    const whole = parts
      .filter(p => p.type === 'integer' || p.type === 'group')
      .map(p => p.value)
      .join('');
    const fraction = parts.find(p => p.type === 'fraction')?.value ?? '';
    if (!whole) throw new Error('unparseable currency parts');
    return { symbol, whole, fraction };
  } catch {
    const amount = toDecimal(amountMinorUnits, currencyCode);
    const whole = Math.floor(amount).toLocaleString('en-US');
    const fraction = decimals === 0
      ? ''
      : String(Math.round((amount % 1) * 10 ** decimals)).padStart(decimals, '0');
    return { symbol: '$', whole, fraction };
  }
}

export function discountPercent(priceMinorUnits: number, listMinorUnits: number): number {
  if (!listMinorUnits || listMinorUnits <= priceMinorUnits) return 0;
  return Math.round(((listMinorUnits - priceMinorUnits) / listMinorUnits) * 100);
}
