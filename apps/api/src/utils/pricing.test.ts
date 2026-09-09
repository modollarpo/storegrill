import { describe, it, expect } from 'vitest';
import { compareAtPriceOf, resolveProductPricing } from './pricing.js';

describe('compareAtPriceOf', () => {
  it('returns the compare-at price when it exceeds the base price', () => {
    const product = {
      basePriceMinorUnits: 1000,
      variants: [
        { attributes: JSON.stringify([{ name: 'size', value: 'L' }, { name: 'compare at price', value: '1499' }]) },
      ],
    };
    expect(compareAtPriceOf(product)).toBe(1499);
  });

  it('returns undefined when the compare-at price is not above the base price', () => {
    const product = {
      basePriceMinorUnits: 2000,
      variants: [
        { attributes: JSON.stringify([{ name: 'compare at price', value: '1500' }]) },
      ],
    };
    expect(compareAtPriceOf(product)).toBeUndefined();
  });

  it('returns undefined when no compare-at attribute exists', () => {
    const product = {
      basePriceMinorUnits: 1000,
      variants: [
        { attributes: JSON.stringify([{ name: 'material', value: 'cotton' }]) },
      ],
    };
    expect(compareAtPriceOf(product)).toBeUndefined();
  });

  it('returns undefined when there are no variants', () => {
    expect(compareAtPriceOf({ basePriceMinorUnits: 1000 })).toBeUndefined();
  });

  it('tolerates malformed variant attribute JSON', () => {
    const product = {
      basePriceMinorUnits: 1000,
      variants: [
        { attributes: '{not-valid-json' },
        { attributes: JSON.stringify([{ name: 'compare at price', value: '1299' }]) },
      ],
    };
    expect(compareAtPriceOf(product)).toBe(1299);
  });
});

describe('resolveProductPricing', () => {
  const costwayProduct = {
    id: 'p1',
    categoryId: 'cat-1',
    vendorId: 'v-costway',
    basePriceMinorUnits: 10000,
    currencyCode: 'GBP',
    regionPrices: [{ regionKey: 'UK', priceMinorUnits: 10000, currencyCode: 'GBP' }],
    variants: [],
  };

  it('applies a flash deal to products listed in flashProductIds', () => {
    const deal = {
      id: 'd-flash',
      type: 'FLASH_SALE',
      value: 25,
      vendorId: 'v-costway',
      categoryIds: [],
      metadata: { flashProductIds: ['p1'] },
      variants: [],
    };
    const r = resolveProductPricing(costwayProduct, 'UK', [deal]);
    expect(r.price).toBe(7500);
    expect(r.listPriceMinorUnits).toBe(10000);
    expect(r.discountPercent).toBe(25);
    expect(r.dealId).toBe('d-flash');
    expect(r.dealType).toBe('FLASH_SALE');
  });

  it('skips vendor-mismatched flash deals', () => {
    const deal = {
      id: 'd-flash',
      type: 'FLASH_SALE',
      value: 25,
      vendorId: 'v-other',
      categoryIds: [],
      metadata: { flashProductIds: ['p1'] },
      variants: [],
    };
    const r = resolveProductPricing(costwayProduct, 'UK', [deal]);
    expect(r.price).toBe(10000);
    expect(r.discountPercent).toBeUndefined();
  });

  it('applies category deals by exact category with vendor gating', () => {
    const deal = {
      id: 'd-cat',
      type: 'PERCENTAGE_OFF',
      value: 25,
      vendorId: 'v-costway',
      categoryIds: ['cat-1'],
      metadata: null,
      variants: [],
    };
    expect(resolveProductPricing(costwayProduct, 'UK', [deal]).price).toBe(7500);
    const otherVendor = { ...costwayProduct, vendorId: 'v-aosom' };
    const r = resolveProductPricing(otherVendor, 'UK', [deal]);
    expect(r.price).toBe(10000);
    expect(r.discountPercent).toBeUndefined();
  });

  it('falls back to the compare-at price when no deal matches', () => {
    const withCompareAt = {
      ...costwayProduct,
      variants: [{ attributes: JSON.stringify([{ name: 'compare at price', value: '12599' }]) }],
    };
    const r = resolveProductPricing(withCompareAt, 'UK', []);
    expect(r.price).toBe(10000);
    expect(r.listPriceMinorUnits).toBe(12599);
    expect(r.discountPercent).toBe(21);
    expect(r.dealId).toBeNull();
  });
});
