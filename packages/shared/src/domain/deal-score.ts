/**
 * Explainable Deal Score (0–100).
 * Every component is computed from grounded, deterministic inputs — nothing
 * is fabricated (never scarcity, popularity, discounts, or delivery promises
 * that the merchant did not provide). Ranking can consume the score and its
 * component breakdown.
 */

export interface DealScoreInput {
  /** Basis points discount vs RRP: 3000 = 30%. */
  discountBps: number;
  /** Merchant's average rating 0–5. */
  merchantRating: number;
  /** Characters in the deal title (ideal 40–65). */
  titleLength: number;
  descriptionLength: number;
  imageCount: number;
  /** 0–1 fraction of delivery cost competitiveness vs an ideal figure. */
  shippingScore: number;
  availability: 'UNLIMITED' | 'PLENTY' | 'LOW' | 'SOLD_OUT';
  stockRemaining?: number | null;
  purchaseCap?: number | null;
  /** 0–1 historical conversion trend (grounded in analytics). */
  conversionScore?: number;
  /** Category demand proxy 0–1 (from observed regional demand data). */
  demandScore?: number;
}

export interface DealScoreComponent {
  key: 'value' | 'presentation' | 'shipping' | 'availability' | 'demand' | 'trust';
  label: string;
  points: number;
}

export interface DealScoreResult {
  score: number;
  components: DealScoreComponent[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function computeDealScore(input: DealScoreInput): DealScoreResult {
  const discount = clamp01(input.discountBps / 10000);
  const valuePts = Math.round(50 * (0.2 + 0.8 * discount));

  let titlePts = 25;
  if (input.titleLength > 0 && input.titleLength < 20) titlePts = 12;
  else if (input.titleLength > 65) titlePts = 12;
  const descPts = input.descriptionLength >= 80 ? 15 : input.descriptionLength >= 30 ? 10 : 4;
  const imagePts = input.imageCount >= 3 ? 10 : input.imageCount >= 1 ? 6 : 0;
  const presentationPts = titlePts + Math.max(0, Math.round(descPts * 0.6) + Math.round(imagePts * 0.6));

  const shippingPts = Math.round(30 * clamp01(input.shippingScore));

  const availBase = { UNLIMITED: 1, PLENTY: 1, LOW: 0.7, SOLD_OUT: 0 }[input.availability];
  const availabilityPts = Math.round(15 * availBase);

  const demandPts = Math.round(20 * clamp01(input.demandScore ?? 0.5));

  const trustPts = Math.round(10 * clamp01(input.merchantRating / 5));

  const components: DealScoreComponent[] = [
    { key: 'value', label: 'Value strength', points: valuePts },
    { key: 'presentation', label: 'Title, description & imagery', points: presentationPts },
    { key: 'shipping', label: 'Shipping competitiveness', points: shippingPts },
    { key: 'availability', label: 'Availability & purchase cap', points: availabilityPts },
    { key: 'demand', label: 'Observed demand', points: demandPts },
    { key: 'trust', label: 'Merchant trust', points: trustPts },
  ];

  const score = Math.max(0, Math.min(100, components.reduce((sum, c) => sum + c.points, 0)));
  // A sold-out deal is not merchandisable; never let it rank above marginal.
  const capped = input.availability === 'SOLD_OUT' ? Math.min(score, 45) : score;
  return { score: capped, components };
}