export interface RecommendationProduct {
  id: string;
  categoryId?: string | null;
  rating?: number | null;
  basePriceMinorUnits: bigint | number;
}

export function recommendProducts<T extends RecommendationProduct>(
  allProducts: T[],
  currentProductId: string,
  targetCategoryId?: string | null,
  limit = 4,
): T[] {
  const filtered = allProducts.filter(p => p.id !== currentProductId);
  const scored = filtered.map(p => {
    let score = 0;
    if (targetCategoryId && p.categoryId === targetCategoryId) {
      score += 50;
    }
    score += Number(p.rating ?? 4) * 10;
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.product);
}

export interface MerchantIntelligenceInput {
  totalSalesMinorUnits: bigint | number;
  orderCount: number;
  activeProductsCount: number;
  averageMarginBps: number;
}

export interface MerchantIntelligenceResult {
  healthScore: number;
  velocityStatus: 'HIGH' | 'STABLE' | 'LOW';
  recommendations: string[];
}

export function analyzeMerchantIntelligence(input: MerchantIntelligenceInput): MerchantIntelligenceResult {
  let healthScore = 70;
  if (input.averageMarginBps >= 2000) healthScore += 15;
  if (input.orderCount >= 10) healthScore += 15;
  healthScore = Math.min(100, Math.max(0, healthScore));

  const velocityStatus = input.orderCount >= 20 ? 'HIGH' : input.orderCount >= 5 ? 'STABLE' : 'LOW';

  const recommendations: string[] = [];
  if (input.averageMarginBps < 1500) {
    recommendations.push('Consider reviewing pricing or fulfillment costs to improve profit margins above 15%.');
  }
  if (input.activeProductsCount < 5) {
    recommendations.push('Listing additional product variants can increase catalog visibility and conversion.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Your store performance is healthy across pricing, margin, and order volume.');
  }

  return { healthScore, velocityStatus, recommendations };
}
