import { describe, it, expect } from 'vitest';
import { evaluateDeals, type CartItem, type DealInput } from './deal-engine.js';

const item = (over: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  categoryId: 'electronics',
  quantity: 1,
  unitMinorUnits: 10000,
  currencyCode: 'USD',
  ...over,
});

describe('evaluateDeals', () => {
  it('applies PERCENTAGE_OFF to matched category subtotal', () => {
    const deals: DealInput[] = [
      { id: 'd1', name: '10% off', type: 'PERCENTAGE_OFF', value: 10, categoryIds: ['electronics'] },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({
      items: [item({ quantity: 2, unitMinorUnits: 10000 })],
      deals,
      orderCurrency: 'USD',
    });
    // 2 * 10000 = 20000 minor; 10% = 2000
    expect(totalDiscountMinorUnits).toBe(2000);
  });

  it('caps PERCENTAGE_OFF by maxDiscount', () => {
    const deals: DealInput[] = [
      { id: 'd1', name: 'cap', type: 'PERCENTAGE_OFF', value: 50, categoryIds: [], maxDiscount: 1500 },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({
      items: [item({ quantity: 2, unitMinorUnits: 10000 })],
      deals,
      orderCurrency: 'USD',
    });
    expect(totalDiscountMinorUnits).toBe(1500);
  });

  it('FLASH_SALE behaves as time-windowed percentage off', () => {
    const deals: DealInput[] = [
      { id: 'f1', name: 'Flash', type: 'FLASH_SALE', value: 25, categoryIds: ['electronics'] },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({
      items: [item({ unitMinorUnits: 8000 })],
      deals,
      orderCurrency: 'USD',
    });
    expect(totalDiscountMinorUnits).toBe(2000);
  });

  it('FIXED_AMOUNT converts value (major) to minor units', () => {
    const deals: DealInput[] = [
      { id: 'fx', name: '£5 off', type: 'FIXED_AMOUNT', value: 5, categoryIds: [] },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({
      items: [item({ unitMinorUnits: 10000 })],
      deals,
      orderCurrency: 'GBP',
    });
    expect(totalDiscountMinorUnits).toBe(500);
  });

  it('FREE_SHIPPING sets flag and zero discount', () => {
    const deals: DealInput[] = [
      { id: 'fs', name: 'Free ship', type: 'FREE_SHIPPING', value: 0, categoryIds: [] },
    ];
    const res = evaluateDeals({ items: [item()], deals, orderCurrency: 'USD' });
    expect(res.freeShipping).toBe(true);
    expect(res.totalDiscountMinorUnits).toBe(0);
  });

  it('BOGO discounts the cheaper unit of each pair by 100%', () => {
    const deals: DealInput[] = [
      { id: 'bogo', name: 'BOGO', type: 'BOGO', value: 0, categoryIds: ['electronics'], metadata: { buyQty: 1, getQty: 1, discountPercent: 100 } },
    ];
    const items: CartItem[] = [
      item({ productId: 'a', unitMinorUnits: 5000, quantity: 1 }),
      item({ productId: 'b', unitMinorUnits: 3000, quantity: 1 }),
    ];
    const { totalDiscountMinorUnits, applied } = evaluateDeals({ items, deals, orderCurrency: 'USD' });
    // cheaper (3000) free
    expect(totalDiscountMinorUnits).toBe(3000);
    expect(applied[0].appliedItems.find(i => i.productId === 'b')?.discountMinorUnits).toBe(3000);
  });

  it('BOGO with buy2get1 discounts one of three', () => {
    const deals: DealInput[] = [
      { id: 'bogo', name: 'B2G1', type: 'BOGO', value: 0, categoryIds: ['electronics'], metadata: { buyQty: 2, getQty: 1, discountPercent: 100 } },
    ];
    const items: CartItem[] = [
      item({ productId: 'a', unitMinorUnits: 1000, quantity: 3 }),
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({ items, deals, orderCurrency: 'USD' });
    expect(totalDiscountMinorUnits).toBe(1000);
  });

  it('BUNDLE requires all products present, then discounts bundle subtotal', () => {
    const deals: DealInput[] = [
      { id: 'bundle', name: 'Duo', type: 'BUNDLE', value: 20, metadata: { bundleProductIds: ['a', 'b'] } },
    ];
    const incomplete: CartItem[] = [item({ productId: 'a', unitMinorUnits: 10000 })];
    expect(evaluateDeals({ items: incomplete, deals, orderCurrency: 'USD' }).totalDiscountMinorUnits).toBe(0);

    const complete: CartItem[] = [
      item({ productId: 'a', unitMinorUnits: 10000 }),
      item({ productId: 'b', unitMinorUnits: 5000 }),
    ];
    // 15000 * 20% = 3000
    expect(evaluateDeals({ items: complete, deals, orderCurrency: 'USD' }).totalDiscountMinorUnits).toBe(3000);
  });

  it('converts item currency to order currency before discounting', () => {
    const deals: DealInput[] = [
      { id: 'd', name: '10%', type: 'PERCENTAGE_OFF', value: 10, categoryIds: [] },
    ];
    const items: CartItem[] = [item({ unitMinorUnits: 1000, currencyCode: 'GBP' })]; // 1000 GBP pence
    const { totalDiscountMinorUnits } = evaluateDeals({ items, deals, orderCurrency: 'USD' });
    // 1000 GBP pence -> ~1260 USD cents; 10% ~ 126
    expect(totalDiscountMinorUnits).toBeGreaterThan(100);
    expect(totalDiscountMinorUnits).toBeLessThan(160);
  });

  it('never discounts more than the overall subtotal', () => {
    const deals: DealInput[] = [
      { id: 'd1', name: '50%', type: 'PERCENTAGE_OFF', value: 50, categoryIds: [] },
      { id: 'd2', name: '50%', type: 'PERCENTAGE_OFF', value: 50, categoryIds: [] },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({ items: [item({ unitMinorUnits: 10000 })], deals, orderCurrency: 'USD' });
    expect(totalDiscountMinorUnits).toBe(10000);
  });

  it('skips deals below minOrderAmount', () => {
    const deals: DealInput[] = [
      { id: 'd', name: 'min', type: 'PERCENTAGE_OFF', value: 10, categoryIds: [], minOrderAmount: 5000 },
    ];
    const { totalDiscountMinorUnits } = evaluateDeals({ items: [item({ unitMinorUnits: 1000 })], deals, orderCurrency: 'USD' });
    expect(totalDiscountMinorUnits).toBe(0);
  });
});
