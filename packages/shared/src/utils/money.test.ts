import { describe, it, expect } from 'vitest';
import {
  createMoney,
  moneyFromDecimal,
  moneyToDecimal,
  addMoney,
  subtractMoney,
  multiplyMoney,
  minMoney,
  maxMoney,
  isZero,
  isPositive,
  isNegative,
  applyPercentageMarkup,
  roundUpTo99,
  formatMoney,
  getCurrencyDecimals,
} from './money';

describe('createMoney', () => {
  it('creates money with minor units', () => {
    const m = createMoney(1999n, 'USD');
    expect(m.amountMinorUnits).toBe(1999n);
    expect(m.currencyCode).toBe('USD');
  });
});

describe('moneyFromDecimal', () => {
  it('converts 19.99 to 1999 minor units', () => {
    const m = moneyFromDecimal(19.99, 'USD');
    expect(m.amountMinorUnits).toBe(1999n);
  });

  it('converts 0.01 to 1 minor unit', () => {
    const m = moneyFromDecimal(0.01, 'USD');
    expect(m.amountMinorUnits).toBe(1n);
  });

  it('converts 100 to 10000 minor units', () => {
    const m = moneyFromDecimal(100, 'USD');
    expect(m.amountMinorUnits).toBe(10000n);
  });

  it('handles rounding correctly', () => {
    const m = moneyFromDecimal(1.005, 'USD');
    expect(m.amountMinorUnits).toBe(100n);
  });
});

describe('moneyToDecimal', () => {
  it('converts 1999 minor units to 19.99', () => {
    expect(moneyToDecimal(createMoney(1999n, 'USD'))).toBe(19.99);
  });

  it('converts 1 minor unit to 0.01', () => {
    expect(moneyToDecimal(createMoney(1n, 'USD'))).toBe(0.01);
  });
});

describe('addMoney', () => {
  it('adds two amounts of same currency', () => {
    const result = addMoney(createMoney(100n, 'USD'), createMoney(200n, 'USD'));
    expect(result.amountMinorUnits).toBe(300n);
    expect(result.currencyCode).toBe('USD');
  });

  it('throws on currency mismatch', () => {
    expect(() => addMoney(createMoney(100n, 'USD'), createMoney(100n, 'EUR'))).toThrow('Currency mismatch');
  });
});

describe('subtractMoney', () => {
  it('subtracts two amounts', () => {
    const result = subtractMoney(createMoney(500n, 'USD'), createMoney(200n, 'USD'));
    expect(result.amountMinorUnits).toBe(300n);
  });

  it('can result in negative', () => {
    const result = subtractMoney(createMoney(100n, 'USD'), createMoney(200n, 'USD'));
    expect(result.amountMinorUnits).toBe(-100n);
  });
});

describe('multiplyMoney', () => {
  it('multiplies by a factor', () => {
    const result = multiplyMoney(createMoney(100n, 'USD'), 1.5);
    expect(result.amountMinorUnits).toBe(150n);
  });

  it('rounds to nearest integer', () => {
    const result = multiplyMoney(createMoney(100n, 'USD'), 0.333);
    expect(result.amountMinorUnits).toBe(33n);
  });
});

describe('minMoney / maxMoney', () => {
  it('returns the smaller amount', () => {
    expect(minMoney(createMoney(100n, 'USD'), createMoney(200n, 'USD')).amountMinorUnits).toBe(100n);
  });

  it('returns the larger amount', () => {
    expect(maxMoney(createMoney(100n, 'USD'), createMoney(200n, 'USD')).amountMinorUnits).toBe(200n);
  });
});

describe('isZero / isPositive / isNegative', () => {
  it('identifies zero', () => {
    expect(isZero(createMoney(0n, 'USD'))).toBe(true);
    expect(isZero(createMoney(1n, 'USD'))).toBe(false);
  });

  it('identifies positive', () => {
    expect(isPositive(createMoney(1n, 'USD'))).toBe(true);
    expect(isPositive(createMoney(0n, 'USD'))).toBe(false);
    expect(isPositive(createMoney(-1n, 'USD'))).toBe(false);
  });

  it('identifies negative', () => {
    expect(isNegative(createMoney(-1n, 'USD'))).toBe(true);
    expect(isNegative(createMoney(0n, 'USD'))).toBe(false);
    expect(isNegative(createMoney(1n, 'USD'))).toBe(false);
  });
});

describe('getCurrencyDecimals', () => {
  it('returns 2 for USD', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
  });

  it('returns 0 for zero-decimal currencies', () => {
    expect(getCurrencyDecimals('KRW')).toBe(0);
    expect(getCurrencyDecimals('VND')).toBe(0);
    expect(getCurrencyDecimals('CLP')).toBe(0);
    expect(getCurrencyDecimals('JPY')).toBe(0);
  });

  it('returns 2 for standard currencies', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(getCurrencyDecimals('SEK')).toBe(2);
  });
});

describe('formatMoney', () => {
  it('formats USD correctly', () => {
    const result = formatMoney(createMoney(1999n, 'USD'));
    expect(result).toContain('19.99');
    expect(result).toContain('$');
  });

  it('formats zero-decimal currency', () => {
    const result = formatMoney(createMoney(1500n, 'KRW'));
    expect(result).toContain('1,500');
  });

  it('formats EUR with comma thousands, dot decimal and prefix symbol', () => {
    const result = formatMoney(createMoney(104995n, 'EUR'));
    expect(result).toBe('€1,049.95');
  });

  it('formats GBP with prefix symbol and comma thousands', () => {
    expect(formatMoney(createMoney(104995n, 'GBP'))).toBe('£1,049.95');
    expect(formatMoney(createMoney(11545n, 'GBP'))).toBe('£115.45');
  });
});

describe('applyPercentageMarkup', () => {
  it('adds 10 percent with round-half-up to the minor unit', () => {
    expect(applyPercentageMarkup(createMoney(10495n, 'GBP'), 0.10).amountMinorUnits).toBe(11545n);
    expect(applyPercentageMarkup(createMoney(2495n, 'GBP'), 0.10).amountMinorUnits).toBe(2745n);
  });

  it('keeps the original currency', () => {
    const result = applyPercentageMarkup(createMoney(1000n, 'USD'), 0.10);
    expect(result.currencyCode).toBe('USD');
  });
});

describe('roundUpTo99', () => {
  it('rounds up to the nearest .99 ending', () => {
    expect(roundUpTo99(createMoney(11545n, 'GBP')).amountMinorUnits).toBe(11599n);
    expect(roundUpTo99(createMoney(11000n, 'GBP')).amountMinorUnits).toBe(11099n);
    expect(roundUpTo99(createMoney(1n, 'GBP')).amountMinorUnits).toBe(99n);
  });

  it('keeps a price already ending in .99', () => {
    expect(roundUpTo99(createMoney(10999n, 'GBP')).amountMinorUnits).toBe(10999n);
  });

  it('leaves zero-decimal currencies untouched', () => {
    expect(roundUpTo99(createMoney(1500n, 'JPY')).amountMinorUnits).toBe(1500n);
  });

  it('composes into the full Costway ingest chain: 104.95 -> 115.45 -> 115.99', () => {
    const feed = createMoney(10495n, 'GBP');
    const result = roundUpTo99(applyPercentageMarkup(feed, 0.10));
    expect(result.amountMinorUnits).toBe(11599n);
    expect(formatMoney(result)).toBe('£115.99');
  });
});
