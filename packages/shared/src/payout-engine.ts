
export interface VendorTerms {
  revenueSharePct: number;
  fixedFeeMinorUnits: number;
  currencyCode: string;
}

export interface PayoutOrderItem {
  id: string;
  amountMinorUnits: number;
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
 * Calculates the payout for a vendor based on real-world business logic.
 * The platform takes a percentage commission (revenue share) and a fixed transaction fee per item.
 */
export function calculatePayout(
  items: PayoutOrderItem[],
  terms: VendorTerms
): PayoutResult {
  let totalPayout = 0;
  let totalCommission = 0;
  let totalFixedFees = 0;

  const lines = items.map(item => {
    // 1. Calculate percentage commission
    // revenueSharePct is something like 12.0 for 12%
    const commission = Math.round(item.amountMinorUnits * (terms.revenueSharePct / 100));
    
    // 2. Add fixed transaction fee (e.g., 30 cents per item to cover Stripe/PayPal fees)
    const fixedFee = terms.fixedFeeMinorUnits;

    // 3. Ensure payout doesn't go negative on tiny items
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
      payoutAmount
    };
  });

  return {
    lines,
    totalPayoutMinorUnits: totalPayout,
    totalCommissionMinorUnits: totalCommission,
    totalFixedFeesMinorUnits: totalFixedFees,
  };
}
