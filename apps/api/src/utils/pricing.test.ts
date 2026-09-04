import { describe, it, expect } from 'vitest';
import { compareAtPriceOf } from './pricing.js';

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
