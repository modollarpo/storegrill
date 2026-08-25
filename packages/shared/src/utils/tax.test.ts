import { describe, it, expect } from 'vitest';
import { calculateTax, calculateItemTax, TaxRule } from './tax';
import { createMoney } from './money';

const usTaxRules: TaxRule[] = [
  { id: '1', name: 'US Sales Tax', rate: 0.0825, type: 'SALES_TAX', enabled: true },
  { id: '2', name: 'EU VAT', rate: 0.19, type: 'VAT', enabled: false },
  { id: '3', name: 'Electronics Tax', rate: 0.05, type: 'SALES_TAX', categoryId: 'cat-electronics', enabled: true },
  { id: '4', name: 'Min Amount Tax', rate: 0.10, type: 'SALES_TAX', minAmount: 10000n, enabled: true },
];

describe('calculateTax', () => {
  it('calculates tax on subtotal with no category rules', () => {
    const result = calculateTax(
      {
        subtotal: createMoney(10000n, 'USD'),
        items: [{ productId: 'p1', categoryId: 'cat-general', priceMinorUnits: 10000n, quantity: 1 }],
        regionKey: 'US',
        shippingCost: createMoney(0n, 'USD'),
      },
      [usTaxRules[0]],
    );
    expect(result.totalTax.amountMinorUnits).toBe(825n);
    expect(result.taxLines).toHaveLength(1);
    expect(result.taxLines[0].name).toBe('US Sales Tax');
  });

  it('applies category-specific tax', () => {
    const result = calculateTax(
      {
        subtotal: createMoney(10000n, 'USD'),
        items: [{ productId: 'p1', categoryId: 'cat-electronics', priceMinorUnits: 10000n, quantity: 1 }],
        regionKey: 'US',
        shippingCost: createMoney(0n, 'USD'),
      },
      [usTaxRules[0], usTaxRules[2]],
    );
    expect(result.taxLines).toHaveLength(2);
  });

  it('skips disabled rules', () => {
    const result = calculateTax(
      {
        subtotal: createMoney(10000n, 'USD'),
        items: [{ productId: 'p1', categoryId: 'cat-general', priceMinorUnits: 10000n, quantity: 1 }],
        regionKey: 'US',
        shippingCost: createMoney(0n, 'USD'),
      },
      [usTaxRules[1]], // EU VAT is disabled
    );
    expect(result.totalTax.amountMinorUnits).toBe(0n);
  });

  it('skips rules below minAmount', () => {
    const result = calculateTax(
      {
        subtotal: createMoney(5000n, 'USD'), // below 10000
        items: [{ productId: 'p1', categoryId: 'cat-general', priceMinorUnits: 5000n, quantity: 1 }],
        regionKey: 'US',
        shippingCost: createMoney(0n, 'USD'),
      },
      [usTaxRules[3]],
    );
    expect(result.totalTax.amountMinorUnits).toBe(0n);
  });

  it('returns zero tax with no applicable rules', () => {
    const result = calculateTax(
      {
        subtotal: createMoney(10000n, 'USD'),
        items: [],
        regionKey: 'US',
        shippingCost: createMoney(0n, 'USD'),
      },
      [],
    );
    expect(result.totalTax.amountMinorUnits).toBe(0n);
    expect(result.taxLines).toHaveLength(0);
  });
});

describe('calculateItemTax', () => {
  it('calculates tax for a single item', () => {
    const tax = calculateItemTax(10000n, 1, [usTaxRules[0]]);
    expect(tax).toBe(825n);
  });

  it('calculates tax for multiple quantities', () => {
    const tax = calculateItemTax(1000n, 3, [usTaxRules[0]]);
    expect(tax).toBe(248n); // 3000 * 0.0825 = 247.5, rounded to 248
  });

  it('applies category-specific rules', () => {
    const tax = calculateItemTax(10000n, 1, [usTaxRules[2]], 'cat-electronics');
    expect(tax).toBe(500n); // 10000 * 0.05
  });

  it('skips non-matching category rules', () => {
    const tax = calculateItemTax(10000n, 1, [usTaxRules[2]], 'cat-other');
    expect(tax).toBe(0n);
  });
});
