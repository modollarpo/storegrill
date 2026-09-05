/**
 * Merchant trust/risk engine.
 * Produces a 0–1000 score plus an explainable component breakdown and a
 * coarse tier. Internal risk internals are never exposed to merchants — only
 * `tier` and a summary label should be surfaced.
 */

export const TrustTier = {
  HIGH_RISK: 'HIGH_RISK',
  NEW: 'NEW',
  STANDARD: 'STANDARD',
  TRUSTED: 'TRUSTED',
  PREMIUM: 'PREMIUM',
} as const;

export type TrustTierValue = (typeof TrustTier)[keyof typeof TrustTier];

export const VerificationLevel = {
  UNVERIFIED: 'UNVERIFIED',
  BASIC: 'BASIC',
  FULL: 'FULL',
} as const;

export type VerificationLevelValue = (typeof VerificationLevel)[keyof typeof VerificationLevel];

export interface TrustFactors {
  successfulDeliveries: number;
  lateDispatches: number;
  cancellations: number;
  refunds: number;
  disputes: number;
  chargebacks: number;
  /** 0–1 fraction of shipments with compliant tracking. */
  trackingComplianceRate: number;
  /** 0–5 average review rating. */
  averageRating: number;
  orderCount: number;
  monthsTenure: number;
  policyViolations: number;
  verificationLevel: VerificationLevelValue;
}

export interface TrustComponent {
  key: string;
  label: string;
  points: number;
}

export interface TrustResult {
  score: number;
  tier: TrustTierValue;
  components: TrustComponent[];
  summary: string;
}

const WEIGHTS = {
  deliveries: 300,
  tracking: 150,
  rating: 150,
  returns: 120,
  disputes: 120,
  tenure: 100,
  verification: 60,
} as const;

const TIER_MIN_SCORE: { tier: TrustTierValue; min: number }[] = [
  { tier: TrustTier.PREMIUM, min: 850 },
  { tier: TrustTier.TRUSTED, min: 700 },
  { tier: TrustTier.STANDARD, min: 450 },
  { tier: TrustTier.NEW, min: 250 },
  { tier: TrustTier.HIGH_RISK, min: 0 },
];

export function computeTrustScore(factors: TrustFactors): TrustResult {
  const components: TrustComponent[] = [];

  {
    const total = factors.successfulDeliveries + factors.lateDispatches + factors.cancellations;
    const base = total === 0 ? 0.7 : factors.successfulDeliveries / total;
    let points = Math.round(WEIGHTS.deliveries * Math.min(1, base));
    points -= Math.min(factors.lateDispatches * 2, points);
    components.push({ key: 'deliveries', label: 'Fulfilment reliability', points });
  }

  {
    const points = Math.round(WEIGHTS.tracking * Math.min(1, factors.trackingComplianceRate));
    components.push({ key: 'tracking', label: 'Tracking compliance', points });
  }

  {
    const points = Math.round(WEIGHTS.rating * (factors.averageRating / 5));
    components.push({ key: 'rating', label: 'Customer rating', points });
  }

  {
    const total = factors.orderCount;
    const refundRate = total === 0 ? 0 : factors.refunds / total;
    const points = Math.max(0, Math.round(WEIGHTS.returns * (1 - refundRate * 5)));
    components.push({ key: 'returns', label: 'Returns rate', points });
  }

  {
    const total = factors.orderCount;
    const disputeRate = total === 0 ? 0 : (factors.disputes + factors.chargebacks) / total;
    const points = Math.max(0, Math.round(WEIGHTS.disputes * (1 - disputeRate * 10)));
    components.push({ key: 'disputes', label: 'Disputes & chargebacks', points });
  }

  {
    const points = Math.min(WEIGHTS.tenure, Math.round(WEIGHTS.tenure * Math.min(1, factors.monthsTenure / 12)));
    components.push({ key: 'tenure', label: 'Marketplace tenure', points: Math.max(0, points) });
  }

  {
    const verificationBasis = { UNVERIFIED: 0, BASIC: 0.5, FULL: 1 }[factors.verificationLevel];
    const points = Math.max(0, Math.round(WEIGHTS.verification * verificationBasis));
    components.push({ key: 'verification', label: 'Verification level', points });
  }

  const penalty = Math.min(components.reduce((sum, c) => sum + c.points, 0), factors.policyViolations * 50);
  const score = Math.max(0, Math.min(1000, components.reduce((sum, c) => sum + c.points, 0) - penalty));
  const tier = TIER_MIN_SCORE.find(t => score >= t.min)!.tier;

  const summary = trustSummary(tier);
  return { score, tier, components, summary };
}

function trustSummary(tier: TrustTierValue): string {
  switch (tier) {
    case TrustTier.PREMIUM:
      return 'Verified, dependable merchant eligible for the fastest settlement';
    case TrustTier.TRUSTED:
      return 'Reliable merchant eligible for faster settlement terms';
    case TrustTier.STANDARD:
      return 'Standard merchant — standard settlement terms apply';
    case TrustTier.NEW:
      return 'New merchant — settlement may require additional verification';
    case TrustTier.HIGH_RISK:
      return 'Merchant under review — additional controls apply';
    default:
      return '';
  }
}