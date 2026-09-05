import { describe, it, expect } from 'vitest';
import { computeCommission, selectCommissionRule, CommissionBasis, CommissionRule } from './commission';
import { computeProfitability } from './profitability';
import { computeMarketingFee, MarketingChannel, MarketingFeeModel, DEFAULT_MARKETING_FEE_BANDS } from './marketing';
import { computeSettlementEligibility, SettlementPolicyType } from './settlement';
import { computeTrustScore, VerificationLevel, TrustTier } from './trust';
import { computeDealScore } from './deal-score';
import {
  canTransitionMerchantStatus,
  MerchantStatus,
  validateMerchantTransition,
  hasMerchantPermission,
  MerchantRole,
  MerchantPermission,
} from './merchant';
import { percentOf, toBasisPoints } from '../utils/money';
import { parseStringList } from '../utils/string-list';

describe('money helpers', () => {
  it('percentOf rounds half-up on integer minor units', () => {
    expect(percentOf(10000n, 2000n)).toBe(2000n);
    expect(percentOf(11799n, 1250n)).toBe(1475n);
    expect(percentOf(3n, 5000n)).toBe(2n);
    expect(percentOf(0n, 9999n)).toBe(0n);
  });

  it('toBasisPoints converts percentages', () => {
    expect(toBasisPoints(12.5)).toBe(1250);
    expect(toBasisPoints(20)).toBe(2000);
  });
});

describe('parseStringList', () => {
  it('handles JSON array strings, plain csv, scalars, and arrays', () => {
    expect(parseStringList('["en","de"]')).toEqual(['en', 'de']);
    expect(parseStringList('en,de,fr')).toEqual(['en', 'de', 'fr']);
    expect(parseStringList('en')).toEqual(['en']);
    expect(parseStringList(['GBP', 'EUR'])).toEqual(['GBP', 'EUR']);
    expect(parseStringList('["broken')).toEqual(['["broken']);
    expect(parseStringList(null)).toEqual([]);
    expect(parseStringList(undefined)).toEqual([]);
    expect(parseStringList('')).toEqual([]);
  });
});

describe('merchant lifecycle', () => {
  it('allows the happy path DRAFT → APPLICATION → UNDER_REVIEW → VERIFIED → ACTIVE', () => {
    const steps: string[] = [
      MerchantStatus.DRAFT,
      MerchantStatus.APPLICATION,
      MerchantStatus.UNDER_REVIEW,
      MerchantStatus.VERIFIED,
      MerchantStatus.ACTIVE,
    ];
    for (let i = 0; i < steps.length - 1; i++) {
      expect(canTransitionMerchantStatus(steps[i] as any, steps[i + 1] as any)).toBe(true);
    }
  });

  it('rejects illegal skips and terminal transitions', () => {
    expect(canTransitionMerchantStatus(MerchantStatus.DRAFT as any, MerchantStatus.ACTIVE as any)).toBe(false);
    expect(canTransitionMerchantStatus(MerchantStatus.TERMINATED as any, MerchantStatus.ACTIVE as any)).toBe(false);
  });

  it('requires KYC before progressing toward VERIFIED/ACTIVE', () => {
    expect(validateMerchantTransition(MerchantStatus.UNDER_REVIEW as any, MerchantStatus.VERIFIED as any, false)).toContain('KYC');
    expect(validateMerchantTransition(MerchantStatus.UNDER_REVIEW as any, MerchantStatus.VERIFIED as any, true)).toBeNull();
  });

  it('enforces role permissions', () => {
    expect(hasMerchantPermission(MerchantRole.MERCHANT_FULFILMENT, MerchantPermission.FULFILMENT_UPDATE)).toBe(true);
    expect(hasMerchantPermission(MerchantRole.MERCHANT_FULFILMENT, MerchantPermission.PAYOUTS_APPROVE)).toBe(false);
    expect(hasMerchantPermission(MerchantRole.PLATFORM_ADMIN, MerchantPermission.SETTLEMENT_APPROVE)).toBe(true);
  });
});

describe('commission engine', () => {
  const base = {
    dealPriceMinorUnits: 11799n,
    shippingMinorUnits: 3699n,
    taxMinorUnits: 0n,
  };

  it('computes DEAL_PRICE commission and returns an immutable snapshot', () => {
    const rule: CommissionRule = { basis: CommissionBasis.DEAL_PRICE, rateBps: 1250 };
    const result = computeCommission(rule, base);
    expect(result.commissionMinorUnits).toBe(1475n);
    expect(result.snapshot.basis).toBe('DEAL_PRICE');
    expect(result.snapshot.rateBps).toBe(1250);
    expect(result.snapshot.applicableAmountMinorUnits).toBe(11799n);
  });

  it('clamps between min and max commission', () => {
    const minRule: CommissionRule = { basis: CommissionBasis.DEAL_PRICE, rateBps: 100, minCommissionMinorUnits: 500n };
    expect(computeCommission(minRule, base).commissionMinorUnits).toBe(500n);

    const maxRule: CommissionRule = { basis: CommissionBasis.DEAL_PRICE, rateBps: 1250, maxCommissionMinorUnits: 1000n };
    expect(computeCommission(maxRule, base).commissionMinorUnits).toBe(1000n);
  });

  it('selects merchant override over category over region over global', () => {
    const rules: CommissionRule[] = [
      { id: 'global', basis: CommissionBasis.DEAL_PRICE, rateBps: 1500 },
      { id: 'region', regionKey: 'GB', basis: CommissionBasis.DEAL_PRICE, rateBps: 1200 },
      { id: 'cat', categoryId: 'c1', basis: CommissionBasis.DEAL_PRICE, rateBps: 1100 },
      { id: 'merchant', merchantId: 'm1', basis: CommissionBasis.DEAL_PRICE, rateBps: 900 },
    ];
    const selected = selectCommissionRule(rules, { merchantId: 'm1', regionKey: 'GB', categoryId: 'c1' });
    expect(selected?.id).toBe('merchant');
  });

  it('respects effective windows', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const rules: CommissionRule[] = [
      { id: 'old', basis: CommissionBasis.DEAL_PRICE, rateBps: 500, effectiveFrom: null, effectiveTo: '2020-01-01' },
      { id: 'current', basis: CommissionBasis.DEAL_PRICE, rateBps: 2000 },
    ];
    const selected = selectCommissionRule(rules, { ...base, asOf: now });
    expect(selected?.id).toBe('current');
  });

  it('calculates MERCHANT_PAYOUT basis self-consistently', () => {
    const rule: CommissionRule = { basis: CommissionBasis.MERCHANT_PAYOUT, rateBps: 1500 };
    const result = computeCommission(rule, {
      ...base,
      dealPriceMinorUnits: 10000n,
      shippingMinorUnits: 0n,
      paymentFeeMinorUnits: 200n,
    });
    // payout before commission = 9800; commission = 9800 * 0.15 / 1.15
    const commission = result.commissionMinorUnits;
    const payout = 9800n - commission;
    const commissionOnPayout = (payout * 1500n) / 10000n;
    expect(Math.abs(Number(commissionOnPayout - commission))).toBeLessThanOrEqual(1);
    expect(commission).toBeGreaterThan(0n);
  });
});

describe('profitability engine (§59 sample)', () => {
  it('produces deterministic economics for the canon deal', () => {
    const r = computeProfitability({
      rrpMinorUnits: 15699n,
      dealPriceMinorUnits: 11799n,
      shippingRevenueMinorUnits: 3699n,
      taxMinorUnits: 0n,
      marketplaceCommissionMinorUnits: 1475n,
      paymentFeeMinorUnits: 240n,
      marketingFeeMinorUnits: 2938n, // band A: 11799 * 24.9% ≈ 2938 (configurable)
      estimatedFulfilmentCostMinorUnits: 800n,
      refundReserveMinorUnits: 400n,
    });
    expect(r.customerTotalMinorUnits).toBe(15498n);
    expect(r.discountBps).toBe(128);
    const expectedNet = 11799n + 3699n - 1475n - 240n - 2938n - 800n;
    expect(r.merchantNetMinorUnits).toBe(expectedNet);
    expect(r.marginMinorUnits).toBe(expectedNet - 400n);
    expect(r.merchantGrossMinorUnits).toBe(15498n);
  });

  it('never yields a negative net', () => {
    const r = computeProfitability({
      rrpMinorUnits: 5000n,
      dealPriceMinorUnits: 1000n,
      shippingRevenueMinorUnits: 0n,
      marketplaceCommissionMinorUnits: 5000n,
    });
    expect(r.merchantNetMinorUnits).toBe(0n);
  });
});

describe('marketing fee engine', () => {
  it('charges nothing when the channel is not opted in', () => {
    const r = computeMarketingFee({
      dealPriceMinorUnits: 10000n,
      channel: MarketingChannel.NEWSLETTER,
      participation: { enabled: false, feeModel: MarketingFeeModel.PRICE_BAND },
    });
    expect(r.feeMinorUnits).toBe(0n);
    expect(r.enabled).toBe(false);
  });

  it('applies the Storegrill default price bands', () => {
    const low = computeMarketingFee({
      dealPriceMinorUnits: 3000n,
      channel: MarketingChannel.EMAIL,
      participation: { enabled: true, feeModel: MarketingFeeModel.PRICE_BAND },
    });
    expect(low.rateBps).toBe(2000);
    expect(low.feeMinorUnits).toBe(600n);

    const high = computeMarketingFee({
      dealPriceMinorUnits: 6000n,
      channel: MarketingChannel.EMAIL,
      participation: { enabled: true, feeModel: MarketingFeeModel.PRICE_BAND },
    });
    expect(high.rateBps).toBe(2500);
    expect(high.feeMinorUnits).toBe(1500n);
  });

  it('supports a fixed-fee model', () => {
    const r = computeMarketingFee({
      dealPriceMinorUnits: 9000n,
      channel: MarketingChannel.FEATURED,
      participation: { enabled: true, feeModel: MarketingFeeModel.FIXED, fixedFeeMinorUnits: 2500n },
    });
    expect(r.feeMinorUnits).toBe(2500n);
  });

  it('keeps bands configurable, not hardcoded', () => {
    const bands = [{ minDealPriceMinorUnits: 0n, maxDealPriceMinorUnits: null, rateBps: 1000 }];
    const r = computeMarketingFee({
      dealPriceMinorUnits: 12345n,
      channel: MarketingChannel.NEWSLETTER,
      participation: { enabled: true, feeModel: MarketingFeeModel.PRICE_BAND },
      bands,
    });
    expect(r.rateBps).toBe(1000);
    expect(DEFAULT_MARKETING_FEE_BANDS.length).toBeGreaterThan(0);
  });
});

describe('settlement engine', () => {
  const deliveredAt = new Date('2026-01-10T00:00:00Z');

  it('DELIVERY_VERIFIED becomes eligible on verified delivery', () => {
    const r = computeSettlementEligibility({
      policy: { type: SettlementPolicyType.DELIVERY_VERIFIED },
      deliveredAt,
      asOf: new Date('2026-01-11T00:00:00Z'),
    });
    expect(r.eligible).toBe(true);
    expect(r.eligibleAt?.toISOString()).toBe('2026-01-10T00:00:00.000Z');
  });

  it('FIXED_DAYS_AFTER_DELIVERY holds for the configured period', () => {
    const r = computeSettlementEligibility({
      policy: { type: SettlementPolicyType.FIXED_DAYS_AFTER_DELIVERY, fixedDaysAfterDelivery: 7 },
      deliveredAt,
      asOf: new Date('2026-01-16T00:00:00Z'),
    });
    expect(r.eligible).toBe(false);
    expect(r.eligibleAt?.toISOString()).toBe('2026-01-17T00:00:00.000Z');
  });

  it('CUSTOMER_CONFIRMED waits for buyer confirmation', () => {
    expect(
      computeSettlementEligibility({
        policy: { type: SettlementPolicyType.CUSTOMER_CONFIRMED },
        deliveredAt,
        asOf: new Date('2026-01-20T00:00:00Z'),
      }).eligible,
    ).toBe(false);
    expect(
      computeSettlementEligibility({
        policy: { type: SettlementPolicyType.CUSTOMER_CONFIRMED },
        deliveredAt,
        confirmedAt: new Date('2026-01-12T00:00:00Z'),
        asOf: new Date('2026-01-13T00:00:00Z'),
      }).eligible,
    ).toBe(true);
  });

  it('MANUAL_RELEASE is never auto-eligible', () => {
    const r = computeSettlementEligibility({
      policy: { type: SettlementPolicyType.MANUAL_RELEASE },
      deliveredAt,
      asOf: new Date('2030-01-01T00:00:00Z'),
    });
    expect(r.eligible).toBe(false);
  });
});

describe('trust engine', () => {
  it('produces explainable components and maps to tiers', () => {
    const r = computeTrustScore({
      successfulDeliveries: 900,
      lateDispatches: 5,
      cancellations: 3,
      refunds: 10,
      disputes: 1,
      chargebacks: 0,
      trackingComplianceRate: 0.99,
      averageRating: 4.8,
      orderCount: 908,
      monthsTenure: 24,
      policyViolations: 0,
      verificationLevel: VerificationLevel.FULL,
    });
    expect(r.score).toBeGreaterThanOrEqual(850);
    expect(r.tier).toBe(TrustTier.PREMIUM);
    expect(r.components.length).toBe(7);
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it('flags high-risk merchants', () => {
    const r = computeTrustScore({
      successfulDeliveries: 10,
      lateDispatches: 30,
      cancellations: 40,
      refunds: 50,
      disputes: 20,
      chargebacks: 5,
      trackingComplianceRate: 0.2,
      averageRating: 1.5,
      orderCount: 80,
      monthsTenure: 1,
      policyViolations: 3,
      verificationLevel: VerificationLevel.UNVERIFIED,
    });
    expect(r.score).toBeLessThan(250);
    expect(r.tier).toBe(TrustTier.HIGH_RISK);
  });
});

describe('deal score', () => {
  it('scores a strong deal highly with all components present', () => {
    const r = computeDealScore({
      discountBps: 2500,
      merchantRating: 4.6,
      titleLength: 48,
      descriptionLength: 300,
      imageCount: 4,
      shippingScore: 0.9,
      availability: 'PLENTY',
      demandScore: 0.8,
    });
    expect(r.score).toBeGreaterThan(70);
    expect(r.components.map(c => c.key)).toContain('value');
    expect(r.components.map(c => c.key)).toContain('trust');
  });

  it('SOLD_OUT availability caps desire-based components', () => {
    const r = computeDealScore({
      discountBps: 2500,
      merchantRating: 4.6,
      titleLength: 48,
      descriptionLength: 300,
      imageCount: 4,
      shippingScore: 0.9,
      availability: 'SOLD_OUT',
      demandScore: 0.8,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(45);
  });

  it('never returns a score outside 0–100', () => {
    const r = computeDealScore({
      discountBps: 0,
      merchantRating: 0,
      titleLength: 200,
      descriptionLength: 0,
      imageCount: 0,
      shippingScore: 0,
      availability: 'UNLIMITED',
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});