import { describe, expect, it } from 'vitest';
import { toProductCards, type VendorStorefrontProduct } from './vendor-storefront';

const resolved: VendorStorefrontProduct = {
  id: 'p1',
  name: 'Cast Iron Pan',
  slug: 'cast-iron-pan',
  thumbnail: 'pan.jpg',
  price: 3749,
  listPriceMinorUnits: 4999,
  basePriceMinorUnits: 4999,
  currencyCode: 'GBP',
  rating: 4.5,
  reviewCount: 12,
  inventoryCount: 7,
};

describe('toProductCards', () => {
  it('maps the resolved price and list price onto the card', () => {
    const [card] = toProductCards([resolved]);
    expect(card.price).toBe(3749);
    expect(card.listPrice).toBe(4999);
    expect(card.currencyCode).toBe('GBP');
    expect(card.inventoryCount).toBe(7);
  });

  it('falls back to basePriceMinorUnits when the feed carries no resolved price', () => {
    const [card] = toProductCards([{ ...resolved, price: undefined, listPriceMinorUnits: undefined }]);
    expect(card.price).toBe(4999);
    expect(Number.isFinite(card.price)).toBe(true);
  });

  it('never produces a non-finite price from a null or absent amount', () => {
    const [card] = toProductCards([{ ...resolved, price: null, listPriceMinorUnits: null, basePriceMinorUnits: null }]);
    expect(Number.isFinite(card.price)).toBe(true);
    expect(card.price).toBe(0);
  });

  it('never produces a non-finite price from a NaN amount', () => {
    const [card] = toProductCards([{ ...resolved, price: Number.NaN, listPriceMinorUnits: Number.NaN }]);
    expect(Number.isFinite(card.price)).toBe(true);
  });

  it('omits the list price unless it is above the current price', () => {
    expect(toProductCards([{ ...resolved, listPriceMinorUnits: 3749 }])[0].listPrice).toBeUndefined();
    expect(toProductCards([{ ...resolved, listPriceMinorUnits: 2999 }])[0].listPrice).toBeUndefined();
    expect(toProductCards([resolved])[0].listPrice).toBe(4999);
  });

  it('leaves inventoryCount undefined when the feed omits it', () => {
    const withoutStock: VendorStorefrontProduct = { ...resolved, inventoryCount: null };
    expect(toProductCards([withoutStock])[0].inventoryCount).toBeUndefined();
  });
});
