import { describe, it, expect } from 'vitest';
import {
  paypalMoney,
  paypalUnitAmount,
  initiateStripePayment,
  buildPaypalBreakdown,
  type PaymentOrderContext,
} from './providers.js';

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

describe('buildPaypalBreakdown', () => {
  // Regression for the live ITEM_TOTAL_MISMATCH: a GBP order of 3 x 124.91 with
  // an 84.94 shipping+tax tail was sent as item_total 459.67 while the items
  // only summed to 374.73.
  const reportedCase: PaymentOrderContext = {
    orderNumber: 'SG-1',
    currencyCode: 'GBP',
    totalMinorUnits: 45967,
    shippingMinorUnits: 4994,
    taxMinorUnits: 3500,
    items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
  };

  it('keeps item_total equal to the sum of unit_amount * quantity', () => {
    const breakdown = buildPaypalBreakdown(reportedCase);
    expect(breakdown.item_total).toEqual({ currency_code: 'GBP', value: '374.73' });

    const itemTotalMinorUnits = reportedCase.items.reduce(
      (sum, item) => sum + item.unitPriceMinorUnits * item.quantity,
      0
    );
    expect(breakdown.item_total.value).toBe((itemTotalMinorUnits / 100).toFixed(2));
  });

  it('declares shipping and tax so the breakdown sums to amount.value', () => {
    const breakdown = buildPaypalBreakdown(reportedCase);
    expect(breakdown.shipping).toEqual({ currency_code: 'GBP', value: '49.94' });
    expect(breakdown.tax_total).toEqual({ currency_code: 'GBP', value: '35.00' });

    const sum =
      Number(breakdown.item_total.value) +
      Number(breakdown.shipping.value) +
      Number(breakdown.tax_total.value);
    expect(sum.toFixed(2)).toBe(paypalMoney(reportedCase).value);
  });

  it('emits the discount as a negative amount', () => {
    const breakdown = buildPaypalBreakdown({
      orderNumber: 'SG-2',
      currencyCode: 'GBP',
      totalMinorUnits: 36473,
      discountMinorUnits: 1000,
      items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
    });
    expect(breakdown.item_total).toEqual({ currency_code: 'GBP', value: '374.73' });
    expect(breakdown.discount).toEqual({ currency_code: 'GBP', value: '-10.00' });
    expect(breakdown.shipping).toBeUndefined();
    expect(breakdown.tax_total).toBeUndefined();
  });

  it('omits zero-value components', () => {
    const breakdown = buildPaypalBreakdown({
      orderNumber: 'SG-3',
      currencyCode: 'GBP',
      totalMinorUnits: 37473,
      shippingMinorUnits: 0,
      taxMinorUnits: 0,
      discountMinorUnits: 0,
      items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
    });
    expect(breakdown).toEqual({ item_total: { currency_code: 'GBP', value: '374.73' } });
  });

  it('rejects an order whose components do not reconcile to the total', () => {
    expect(() =>
      buildPaypalBreakdown({
        orderNumber: 'SG-4',
        currencyCode: 'GBP',
        totalMinorUnits: 50000,
        items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
      })
    ).toThrow(/does not reconcile/);
  });
});
