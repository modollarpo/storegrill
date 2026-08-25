import { describe, it, expect } from 'vitest';
import { getExchangeRate, convertMoney, convertMoneyWithRate } from './currency';
import { createMoney } from './money';

describe('getExchangeRate', () => {
  it('returns 1 for same currency', () => {
    expect(getExchangeRate('USD', 'USD')).toBe(1);
  });

  it('returns direct rate for USD to EUR', () => {
    const rate = getExchangeRate('USD', 'EUR');
    expect(rate).toBe(0.92);
  });

  it('returns direct rate for EUR to USD', () => {
    const rate = getExchangeRate('EUR', 'USD');
    expect(rate).toBe(1.087);
  });

  it('calculates cross rate via USD', () => {
    const rate = getExchangeRate('EUR', 'INR');
    expect(rate).toBeCloseTo(90.45, 0);
  });

  it('throws for unknown currency pair', () => {
    expect(() => getExchangeRate('XYZ', 'ABC')).toThrow('Exchange rate not available');
  });
});

describe('convertMoney', () => {
  it('returns same money for same currency', () => {
    const usd = createMoney(1000n, 'USD');
    const result = convertMoney(usd, 'USD');
    expect(result.amountMinorUnits).toBe(1000n);
    expect(result.currencyCode).toBe('USD');
  });

  it('converts USD to EUR', () => {
    const usd = createMoney(10000n, 'USD'); // $100.00
    const eur = convertMoney(usd, 'EUR');
    expect(eur.currencyCode).toBe('EUR');
    expect(eur.amountMinorUnits).toBeGreaterThan(0n);
  });

  it('converts USD to INR', () => {
    const usd = createMoney(100n, 'USD'); // $1.00
    const inr = convertMoney(usd, 'INR');
    expect(inr.currencyCode).toBe('INR');
    expect(inr.amountMinorUnits).toBeGreaterThan(0n);
  });
});

describe('convertMoneyWithRate', () => {
  it('converts using provided rate', () => {
    const usd = createMoney(10000n, 'USD'); // $100.00
    const eur = convertMoneyWithRate(usd, 'EUR', 0.85);
    expect(eur.amountMinorUnits).toBe(8500n);
    expect(eur.currencyCode).toBe('EUR');
  });

  it('returns same money for same currency', () => {
    const usd = createMoney(1000n, 'USD');
    const result = convertMoneyWithRate(usd, 'USD', 0.5);
    expect(result.amountMinorUnits).toBe(1000n);
  });
});
