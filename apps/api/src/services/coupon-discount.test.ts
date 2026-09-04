import { describe, it, expect } from 'vitest';
import { computeCouponDiscount } from './coupon-discount.js';

describe('computeCouponDiscount', () => {
  it('PERCENTAGE_OFF applies the percentage of the subtotal', () => {
    expect(
      computeCouponDiscount({
        dealType: 'PERCENTAGE_OFF', dealValue: 10, subtotalMinorUnits: 10000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'USD',
      }),
    ).toBe(1000);
  });

  it('PERCENTAGE_OFF respects maxDiscount', () => {
    expect(
      computeCouponDiscount({
        dealType: 'PERCENTAGE_OFF', dealValue: 50, maxDiscount: 500, subtotalMinorUnits: 10000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'USD',
      }),
    ).toBe(500);
  });

  it('FIXED_AMOUNT in the same currency uses minor units directly', () => {
    expect(
      computeCouponDiscount({
        dealType: 'FIXED_AMOUNT', dealValue: 5, subtotalMinorUnits: 10000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'USD',
      }),
    ).toBe(500);
  });

  it('FIXED_AMOUNT converts from coupon currency to order currency', () => {
    // 10 USD major -> 1000 minor, converted to GBP at the 0.79 fallback rate.
    expect(
      computeCouponDiscount({
        dealType: 'FIXED_AMOUNT', dealValue: 10, subtotalMinorUnits: 10000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'GBP',
      }),
    ).toBe(790);
  });

  it('FIXED_AMOUNT honours zero-decimal currencies (JPY)', () => {
    expect(
      computeCouponDiscount({
        dealType: 'FIXED_AMOUNT', dealValue: 1000, subtotalMinorUnits: 5000,
        couponCurrencyCode: 'JPY', orderCurrencyCode: 'JPY',
      }),
    ).toBe(1000);
  });

  it('never returns a discount larger than the subtotal', () => {
    expect(
      computeCouponDiscount({
        dealType: 'FIXED_AMOUNT', dealValue: 999, subtotalMinorUnits: 1000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'USD',
      }),
    ).toBe(1000);
  });

  it('returns zero for unhandled deal types (BOGO/BUNDLE/FLASH_SALE)', () => {
    expect(
      computeCouponDiscount({
        dealType: 'BOGO', dealValue: 10, subtotalMinorUnits: 1000,
        couponCurrencyCode: 'USD', orderCurrencyCode: 'USD',
      }),
    ).toBe(0);
  });
});
