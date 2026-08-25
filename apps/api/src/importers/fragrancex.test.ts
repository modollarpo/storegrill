import { describe, it, expect } from 'vitest';
import {
  adaptFragranceXRows,
  applyFragranceXPricing,
  isFragranceXHeader,
  type FragranceXFeedRow,
} from './fragrancex.js';

function row(overrides: Partial<FragranceXFeedRow> = {}): FragranceXFeedRow {
  return {
    ITEM: '400012',
    NAME: 'Oblique Rwd by Givenchy',
    DESCRIPTION: 'The perfume bottle designed by Pablo Reinoso.',
    BRAND: 'Givenchy',
    TYPE: 'Two 2/3 oz Eau De Toilette Spray Refills 2/3 oz',
    TITLE: 'Oblique Rwd by Givenchy Two 2/3 oz EDT for Women',
    Size: '2/3 oz',
    Metric_Size: '20 ml',
    GENDER: 'Women',
    MSRP: '32',
    Wholesale_USD: '70.00',
    IMAGE: 'http://img.fragrancex.com/images/products/sku/large/OBL.jpg',
    URL: 'https://www.fragrancex.com/products/oblique?sid=abc&src=drpshp',
    QTY: '25',
    ...overrides,
  };
}

describe('applyFragranceXPricing', () => {
  it('prices at 60% of MSRP when that clears the margin floor', () => {
    expect(applyFragranceXPricing(4140, 9800)).toBe(5899);
  });

  it('clamps to the margin floor when street price would go below it', () => {
    expect(applyFragranceXPricing(17800, 29000)).toBe(22299);
  });

  it('clamps to the wholesale ceiling when gray-market MSRP is inflated', () => {
    expect(applyFragranceXPricing(550, 4000)).toBe(1299);
  });

  it('uses the default markup when MSRP is missing', () => {
    expect(applyFragranceXPricing(1700, null)).toBe(2899);
  });

  it('treats empty MSRP strings as missing', () => {
    expect(applyFragranceXPricing(1700, null)).toBe(2899);
  });
});

describe('adaptFragranceXRows', () => {
  it('groups rows by fragrance name into one product with variants', () => {
    const result = adaptFragranceXRows([
      row(),
      row({
        ITEM: '400013',
        TYPE: 'Gift Set -- 2 pc',
        Wholesale_USD: '31.64',
        MSRP: '65',
      }),
    ]);
    expect(result.errors).toHaveLength(0);
    expect(result.products).toHaveLength(1);
    const product = result.products[0];
    expect(product.baseName).toBe('Oblique Rwd by Givenchy');
    expect(product.brandName).toBe('Givenchy');
    expect(product.variants).toHaveLength(2);
    expect(product.variants[0].sku).toBe('400012');
    expect(product.variants[1].sku).toBe('400013');
    expect(product.variants[1].variantSuffix).toBe('Gift Set -- 2 pc');
  });

  it('derives gender and product-type tags', () => {
    const result = adaptFragranceXRows([row({ TYPE: 'Eau De Toilette Spray (Tester) 4.2 oz' })]);
    expect(result.products[0].tags).toContain('tester');
    expect(result.products[0].tags).toContain('women');
    expect(result.products[0].tags).toContain('fragrancex');
  });

  it('maps category path to Fragrances > gender', () => {
    const result = adaptFragranceXRows([row({ GENDER: 'Men' })]);
    expect(result.products[0].categoryPath).toEqual(['Fragrances', 'Men']);
  });

  it('records size attributes only when present', () => {
    const sized = adaptFragranceXRows([row()]);
    expect(sized.products[0].attributes).toMatchObject({ size: '2/3 oz', metricSize: '20 ml', gender: 'women' });

    const unsized = adaptFragranceXRows([row({ Size: '--', Metric_Size: '--' })]);
    expect(unsized.products[0].attributes).not.toHaveProperty('size');
    expect(unsized.products[0].attributes).not.toHaveProperty('metricSize');
  });

  it('reports errors for rows without SKU or valid wholesale price', () => {
    const result = adaptFragranceXRows([
      row({ ITEM: '' }),
      row({ ITEM: 'x', Wholesale_USD: '' }),
      row({ ITEM: 'y', NAME: '', Wholesale_USD: '10' }),
    ]);
    expect(result.products).toHaveLength(0);
    expect(result.errors.map(e => e.field)).toEqual(['ITEM', 'Wholesale_USD', 'NAME']);
  });

  it('clamps stock at zero, keeps raw quantities, and splits low stock into outOfStock', () => {
    const result = adaptFragranceXRows([
      row({ QTY: '-3' }),
      row({ ITEM: '2', NAME: 'B by B', QTY: '7' }),
      row({ ITEM: '3', NAME: 'C by C', QTY: '40' }),
    ]);
    expect(result.outOfStock).toHaveLength(2);
    expect(result.outOfStock[0].variants[0].stock).toBe(0);
    expect(result.outOfStock[1].variants[0].stock).toBe(7);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].variants[0].stock).toBe(40);
  });

  it('rewrites image URLs to https', () => {
    const result = adaptFragranceXRows([row()]);
    expect(result.products[0].variants[0].images[0]).toMatch(/^https:/);
  });
});

describe('isFragranceXHeader', () => {
  it('detects FragranceX headers by signature columns', () => {
    expect(isFragranceXHeader(['ITEM', 'NAME', 'BRAND', 'Wholesale_USD'])).toBe(true);
    expect(isFragranceXHeader(['SKU', 'Item Name', 'Price'])).toBe(false);
  });
});
