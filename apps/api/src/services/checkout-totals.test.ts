import { describe, it, expect } from 'vitest';
import { calculateTax } from '@Storegrill/shared';
import { convertMoney, createMoney } from '@Storegrill/shared';
import { computeCouponDiscount } from './coupon-discount.js';

const UK_TAX_RULES = [
  { id: 'vat', name: 'VAT', rate: 0.20, type: 'VAT' as const, enabled: true },
];

describe('checkout totals pipeline (integer money)', () => {
  const itemPrice = 2500n;
  const qty = 2;
  const subtotal = Number(itemPrice) * qty;

  it('UK cart: subtotal + 20% VAT + flat shipping = exact integer total', () => {
    const taxResult = calculateTax(
      {
        subtotal: createMoney(BigInt(subtotal), 'GBP'),
        items: [{ productId: 'p1', categoryId: 'cat-general', priceMinorUnits: itemPrice, quantity: qty }],
        regionKey: 'UK',
        shippingCost: createMoney(0n, 'GBP'),
      },
      UK_TAX_RULES,
    );
    const tax = Number(taxResult.totalTax.amountMinorUnits);
    const shipping = 399;
    const total = subtotal + tax + shipping;

    expect(tax).toBe(1000);
    expect(total).toBe(6399);
  });

  it('UK cart + 25% coupon: discount is integer, tax on discounted subtotal', () => {
    const discount = computeCouponDiscount({
      dealType: 'PERCENTAGE_OFF',
      dealValue: 25,
      subtotalMinorUnits: subtotal,
      couponCurrencyCode: 'GBP',
      orderCurrencyCode: 'GBP',
    });
    const discountedSubtotal = subtotal - discount;

    const taxResult = calculateTax(
      {
        subtotal: createMoney(BigInt(discountedSubtotal), 'GBP'),
        items: [{ productId: 'p1', categoryId: 'cat-general', priceMinorUnits: itemPrice, quantity: qty }],
        regionKey: 'UK',
        shippingCost: createMoney(0n, 'GBP'),
      },
      UK_TAX_RULES,
    );
    const tax = Number(taxResult.totalTax.amountMinorUnits);
    const shipping = 399;
    const total = discountedSubtotal + tax + shipping;

    expect(discount).toBe(1250);
    expect(discountedSubtotal).toBe(3750);
    expect(tax).toBe(750);
    expect(total).toBe(4899);
  });

  it('USD to GBP region price conversion is integer-deterministic', () => {
    const usdItem = createMoney(10000n, 'USD');
    const gbpItem = convertMoney(usdItem, 'GBP');
    expect(gbpItem.amountMinorUnits).toBe(7900n);
    expect(gbpItem.currencyCode).toBe('GBP');
  });
});
