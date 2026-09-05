import {
  computeProfitability,
  computeDealScore,
  computeCommission,
  selectCommissionRule,
  type CommissionRule,
  type CommissionInput,
} from '@Storegrill/shared';

export interface DealEvaluationInput {
  rrpMinorUnits: number;
  dealPriceMinorUnits: number;
  shippingRevenueMinorUnits?: number;
  taxMinorUnits?: number;
  paymentFeeMinorUnits?: number;
  estimatedFulfilmentCostMinorUnits?: number;
  refundReserveMinorUnits?: number;
  merchantId?: string;
  regionKey?: string;
  categoryId?: string;
  commissionRules?: CommissionRule[];
  title?: string;
  description?: string;
  imageCount?: number;
  merchantRating?: number;
  availability?: 'UNLIMITED' | 'PLENTY' | 'LOW' | 'SOLD_OUT';
  stockRemaining?: number | null;
  purchaseCap?: number | null;
  demandScore?: number;
  conversionScore?: number;
}

export function evaluateDealEconomics(input: DealEvaluationInput) {
  const dealPrice = BigInt(input.dealPriceMinorUnits);
  const rrp = BigInt(input.rrpMinorUnits);
  const shippingRev = BigInt(input.shippingRevenueMinorUnits ?? 0);
  const tax = BigInt(input.taxMinorUnits ?? 0);
  const paymentFee = BigInt(input.paymentFeeMinorUnits ?? 0);
  const fulfilmentCost = BigInt(input.estimatedFulfilmentCostMinorUnits ?? 0);
  const refundReserve = BigInt(input.refundReserveMinorUnits ?? 0);

  const commissionInput: CommissionInput = {
    merchantId: input.merchantId ?? 'merchant_generic',
    regionKey: input.regionKey ?? 'UK',
    categoryId: input.categoryId,
    dealPriceMinorUnits: dealPrice,
    rrpMinorUnits: rrp,
    shippingMinorUnits: shippingRev,
    taxMinorUnits: tax,
    paymentFeeMinorUnits: paymentFee,
  };

  const sharedRules: CommissionRule[] = (input.commissionRules ?? []).map((r: CommissionRule) => ({ ...r }));
  const matchedRule = selectCommissionRule(sharedRules, commissionInput);
  const commissionSnapshot = matchedRule
    ? computeCommission(matchedRule, commissionInput).snapshot
    : {
        commissionMinorUnits: 0n,
        rateBps: 0,
        ruleId: null,
        basis: 'DEAL_PRICE' as const,
        applicableAmountMinorUnits: dealPrice,
      };

  const profitability = computeProfitability({
    rrpMinorUnits: rrp,
    dealPriceMinorUnits: dealPrice,
    shippingRevenueMinorUnits: shippingRev,
    taxMinorUnits: tax,
    marketplaceCommissionMinorUnits: commissionSnapshot.commissionMinorUnits,
    marketingFeeMinorUnits: 0n,
    paymentFeeMinorUnits: paymentFee,
    estimatedFulfilmentCostMinorUnits: fulfilmentCost,
    refundReserveMinorUnits: refundReserve,
  });

  const titleLength = input.title?.trim().length ?? 0;
  const descriptionLength = input.description?.trim().length ?? 0;
  const imageCount = input.imageCount ?? 0;
  const merchantRating = input.merchantRating ?? 4.5;
  const availability = input.availability ?? 'PLENTY';

  const dealScore = computeDealScore({
    discountBps: profitability.discountBps,
    merchantRating,
    titleLength,
    descriptionLength,
    imageCount,
    shippingScore: shippingRev === 0n ? 1.0 : 0.8,
    availability,
    stockRemaining: input.stockRemaining,
    purchaseCap: input.purchaseCap,
    demandScore: input.demandScore ?? 0.5,
    conversionScore: input.conversionScore ?? 0.5,
  });

  return {
    profitability: {
      customerTotalMinorUnits: Number(profitability.customerTotalMinorUnits),
      savingAgainstRrpMinorUnits: Number(profitability.savingAgainstRrpMinorUnits),
      discountBps: profitability.discountBps,
      merchantGrossMinorUnits: Number(profitability.merchantGrossMinorUnits),
      totalDeductionsMinorUnits: Number(profitability.totalDeductionsMinorUnits),
      merchantNetMinorUnits: Number(profitability.merchantNetMinorUnits),
      marginMinorUnits: Number(profitability.marginMinorUnits),
      marginBps: profitability.marginBps,
      refundReserveMinorUnits: Number(profitability.refundReserveMinorUnits),
    },
    commission: {
      commissionMinorUnits: Number(commissionSnapshot.commissionMinorUnits),
      rateBps: commissionSnapshot.rateBps,
      ruleId: commissionSnapshot.ruleId,
    },
    dealScore,
  };
}
