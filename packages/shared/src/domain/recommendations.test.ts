import { describe, it, expect } from 'vitest';
import { recommendProducts, analyzeMerchantIntelligence } from './recommendations.js';

describe('recommendations and merchant intelligence', () => {
  it('recommends similar category and high rated products', () => {
    const products = [
      { id: '1', categoryId: 'cat_1', rating: 4.5, basePriceMinorUnits: 1000n },
      { id: '2', categoryId: 'cat_1', rating: 4.9, basePriceMinorUnits: 2000n },
      { id: '3', categoryId: 'cat_2', rating: 5.0, basePriceMinorUnits: 1500n },
    ];

    const recommended = recommendProducts(products, '1', 'cat_1', 2);
    expect(recommended[0].id).toBe('2');
  });

  it('analyzes merchant intelligence and health score', () => {
    const analysis = analyzeMerchantIntelligence({
      totalSalesMinorUnits: 500000n,
      orderCount: 15,
      activeProductsCount: 12,
      averageMarginBps: 2200,
    });

    expect(analysis.healthScore).toBe(100);
    expect(analysis.velocityStatus).toBe('STABLE');
  });
});
