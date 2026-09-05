import { describe, it, expect } from 'vitest';
import { evaluateDealEconomics } from './deal-valuation.js';

describe('deal-valuation service', () => {
  it('evaluates profitability and deal score correctly', () => {
    const result = evaluateDealEconomics({
      rrpMinorUnits: 10000,
      dealPriceMinorUnits: 7000,
      shippingRevenueMinorUnits: 0,
      title: 'Premium Wireless Noise-Cancelling Headphones with 40h Battery',
      description: 'Experience crystal-clear audio quality and immersive active noise cancellation for up to 40 hours on a single charge. Comfortable over-ear design.',
      imageCount: 4,
      merchantRating: 4.8,
      availability: 'PLENTY',
    });

    expect(result.profitability.discountBps).toBe(3000);
    expect(result.profitability.marginMinorUnits).toBeGreaterThan(0);
    expect(result.dealScore.score).toBeGreaterThan(50);
    expect(result.dealScore.components.length).toBe(6);
  });
});
