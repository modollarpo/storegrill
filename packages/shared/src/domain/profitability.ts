/**
 * Deterministic profitability engine.
 * Every input is integer minor units or basis points; no floats involved.
 * This is the source of truth for merchant-facing economics — AI is never
 * allowed to influence these figures.
 */

export interface ProfitabilityInput {
  rrpMinorUnits: bigint;
  dealPriceMinorUnits: bigint;
  shippingRevenueMinorUnits: bigint;
  taxMinorUnits?: bigint;
  marketplaceCommissionMinorUnits: bigint;
  marketingFeeMinorUnits?: bigint;
  paymentFeeMinorUnits?: bigint;
  estimatedFulfilmentCostMinorUnits?: bigint;
  refundReserveMinorUnits?: bigint;
}

export interface ProfitabilityResult {
  customerTotalMinorUnits: bigint;
  savingAgainstRrpMinorUnits: bigint;
  discountBps: number;
  merchantGrossMinorUnits: bigint;
  totalDeductionsMinorUnits: bigint;
  merchantNetMinorUnits: bigint;
  marginMinorUnits: bigint;
  marginBps: number;
  refundReserveMinorUnits: bigint;
}

function ratioBps(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  return Number((part * 10000n) / whole);
}

export function computeProfitability(input: ProfitabilityInput): ProfitabilityResult {
  if (input.dealPriceMinorUnits < 0n) throw new Error('dealPriceMinorUnits must be non-negative');
  if (input.shippingRevenueMinorUnits < 0n) throw new Error('shippingRevenueMinorUnits must be non-negative');

  const tax = input.taxMinorUnits ?? 0n;
  const marketingFee = input.marketingFeeMinorUnits ?? 0n;
  const paymentFee = input.paymentFeeMinorUnits ?? 0n;
  const fulfilmentCost = input.estimatedFulfilmentCostMinorUnits ?? 0n;
  const refundReserve = input.refundReserveMinorUnits ?? 0n;

  const customerTotalMinorUnits = input.dealPriceMinorUnits + input.shippingRevenueMinorUnits + tax;
  const savingAgainstRrpMinorUnits = input.rrpMinorUnits - customerTotalMinorUnits < 0n
    ? 0n
    : input.rrpMinorUnits - customerTotalMinorUnits;
  const discountBps = ratioBps(savingAgainstRrpMinorUnits, input.rrpMinorUnits);

  const merchantGrossMinorUnits = input.dealPriceMinorUnits + input.shippingRevenueMinorUnits;
  const totalDeductionsMinorUnits =
    input.marketplaceCommissionMinorUnits + marketingFee + paymentFee + fulfilmentCost;
  const merchantNetMinorUnits = merchantGrossMinorUnits - totalDeductionsMinorUnits < 0n
    ? 0n
    : merchantGrossMinorUnits - totalDeductionsMinorUnits;
  const marginMinorUnits = merchantNetMinorUnits - refundReserve;
  const marginBps = ratioBps(marginMinorUnits, merchantGrossMinorUnits);

  return {
    customerTotalMinorUnits,
    savingAgainstRrpMinorUnits,
    discountBps,
    merchantGrossMinorUnits,
    totalDeductionsMinorUnits,
    merchantNetMinorUnits,
    marginMinorUnits,
    marginBps,
    refundReserveMinorUnits: refundReserve,
  };
}