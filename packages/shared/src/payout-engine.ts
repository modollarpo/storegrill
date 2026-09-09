import { percentOf } from './utils/money.js';

export interface VendorTerms {
  revenueShareBps: number;
  fixedFeeMinorUnits: number;
  currencyCode: string;
}

export interface PayoutOrderItem {
  id: string;
  amountMinorUnits: number;
  commissionOverrideMinorUnits?: number;
}

export interface EnginePayoutLine {
  orderItemId: string;
  itemAmount: number;
  commission: number;
  fixedFee: number;
  payoutAmount: number;
}

export interface PayoutResult {
  lines: EnginePayoutLine[];
  totalPayoutMinorUnits: number;
  totalCommissionMinorUnits: number;
  totalFixedFeesMinorUnits: number;
}

/**
 * Calculates the payout for a vendor using integer minor-unit arithmetic only.
 * The platform takes a commission (revenue share, expressed in basis points)
 * and a fixed transaction fee per item.
 *
 * When an item carries an order-time commission override (the immutable
 * CommissionRule snapshot taken at checkout) that value is used verbatim —
 * historical orders are never recalculated with today's commission rate.
 * Items without an override fall back to the vendor's flat revenue share.
 */
export function calculatePayout(items: PayoutOrderItem[], terms: VendorTerms): PayoutResult {
  let totalPayout = 0;
  let totalCommission = 0;
  let totalFixedFees = 0;

  const lines = items.map(item => {
    const commission = item.commissionOverrideMinorUnits != null && item.commissionOverrideMinorUnits >= 0
      ? item.commissionOverrideMinorUnits
      : Number(percentOf(BigInt(item.amountMinorUnits), terms.revenueShareBps));

    const fixedFee = terms.fixedFeeMinorUnits;

    const deductions = commission + fixedFee;
    const payoutAmount = Math.max(0, item.amountMinorUnits - deductions);

    totalPayout += payoutAmount;
    totalCommission += commission;
    totalFixedFees += fixedFee;

    return {
      orderItemId: item.id,
      itemAmount: item.amountMinorUnits,
      commission,
      fixedFee,
      payoutAmount,
    };
  });

  return {
    lines,
    totalPayoutMinorUnits: totalPayout,
    totalCommissionMinorUnits: totalCommission,
    totalFixedFeesMinorUnits: totalFixedFees,
  };
}
