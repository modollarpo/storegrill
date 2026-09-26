import { describe, expect, it } from 'vitest';
import { formatPrice, isRenderableAmount, NO_PRICE, splitPrice } from './format';

describe('formatPrice', () => {
  it('formats minor units using the currency exponent', () => {
    expect(formatPrice(4999, 'GBP')).toBe('£49.99');
    expect(formatPrice(1500, 'JPY')).toContain('1,500');
  });

  it('renders a placeholder instead of NaN for a non-finite amount', () => {
    expect(formatPrice(Number.NaN, 'GBP')).toBe(NO_PRICE);
    expect(formatPrice(undefined as unknown as number, 'GBP')).toBe(NO_PRICE);
    expect(formatPrice(Number.POSITIVE_INFINITY, 'GBP')).toBe(NO_PRICE);
  });
});

describe('splitPrice', () => {
  it('splits a renderable amount into symbol, whole and fraction', () => {
    expect(splitPrice(29999, 'USD')).toEqual({ symbol: '$', whole: '299', fraction: '99' });
  });

  it('omits the fraction for zero-decimal currencies', () => {
    expect(splitPrice(1500, 'KRW').fraction).toBe('');
  });

  it('returns empty parts for a non-finite amount so callers can detect it', () => {
    expect(splitPrice(Number.NaN, 'GBP')).toEqual({ symbol: '', whole: '', fraction: '' });
    expect(splitPrice(undefined as unknown as number, 'GBP').whole).toBe('');
  });
});

describe('isRenderableAmount', () => {
  it('accepts finite numbers including zero and rejects everything else', () => {
    expect(isRenderableAmount(0)).toBe(true);
    expect(isRenderableAmount(4999)).toBe(true);
    expect(isRenderableAmount(Number.NaN)).toBe(false);
    expect(isRenderableAmount(Number.NaN)).toBe(false);
    expect(isRenderableAmount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isRenderableAmount(undefined as unknown as number)).toBe(false);
    expect(isRenderableAmount('4999' as unknown as number)).toBe(false);
  });
});
