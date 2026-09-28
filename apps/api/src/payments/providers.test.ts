import { describe, it, expect } from 'vitest';
import { paypalMoney, paypalUnitAmount, initiateStripePayment } from './providers.js';

describe('initiateStripePayment', () => {
  it('rejects a method the card processor cannot handle instead of charging a card', async () => {
    const base = {
      orderNumber: 'SG-1',
      currencyCode: 'EUR',
      totalMinorUnits: 1000,
      items: [{ name: 'Item', unitPriceMinorUnits: 1000, quantity: 1 }],
    };
    await expect(initiateStripePayment({ ...base, paymentMethod: 'twint' })).rejects.toThrow(
      /not supported/
    );
    await expect(initiateStripePayment({ ...base, paymentMethod: 'bizum' })).rejects.toThrow(
      /not supported/
    );
  });
});

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
