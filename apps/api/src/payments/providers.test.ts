import { describe, it, expect } from 'vitest';
import { paypalMoney, paypalUnitAmount } from './providers.js';

describe('paypalMoney', () => {
  it('formats a two-decimal currency', () => {
    expect(paypalMoney({ currencyCode: 'USD', totalMinorUnits: 1234 })).toEqual({
      currency_code: 'USD',
      value: '12.34',
    });
  });

  it('formats a zero-decimal currency without a fractional part', () => {
    expect(paypalMoney({ currencyCode: 'JPY', totalMinorUnits: 1500 })).toEqual({
      currency_code: 'JPY',
      value: '1500',
    });
  });
});

describe('paypalUnitAmount', () => {
  it('uses the correct decimal places for the currency', () => {
    expect(paypalUnitAmount(599, 'USD')).toEqual({ currency_code: 'USD', value: '5.99' });
    expect(paypalUnitAmount(599, 'JPY')).toEqual({ currency_code: 'JPY', value: '599' });
  });
});
