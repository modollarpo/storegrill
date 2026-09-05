import { percentOf } from '../utils/money';

/**
 * Configurable marketplace commission engine.
 *
 * A rule is selected from a ruleset by specificity (merchant override >
 * category > region > global), then by priority, then by effective window.
 * The engine returns a deterministic result plus an immutable snapshot that
 * must be persisted with the transaction so historical deals never change
 * when future rules change.
 */

export const CommissionBasis = {
  DEAL_PRICE: 'DEAL_PRICE',
  GROSS_ORDER: 'GROSS_ORDER',
  NET_ORDER: 'NET_ORDER',
  MERCHANT_PAYOUT: 'MERCHANT_PAYOUT',
  MARGIN: 'MARGIN',
} as const;

export type CommissionBasisValue = (typeof CommissionBasis)[keyof typeof CommissionBasis];

export interface CommissionRule {
  id?: string | null;
  merchantId?: string | null;
  regionKey?: string | null;
  categoryId?: string | null;
  basis: CommissionBasisValue;
  /** Percentage as basis points: 1250 = 12.50%. */
  rateBps: number;
  minCommissionMinorUnits?: bigint | null;
  maxCommissionMinorUnits?: bigint | null;
  minMerchantPayoutMinorUnits?: bigint | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  priority?: number;
}

export interface CommissionInput {
  merchantId?: string | null;
  regionKey?: string | null;
  categoryId?: string | null;
  dealPriceMinorUnits: bigint;
  rrpMinorUnits?: bigint | null;
  shippingMinorUnits?: bigint | null;
  taxMinorUnits?: bigint | null;
  paymentFeeMinorUnits?: bigint | null;
  marketingFeeMinorUnits?: bigint | null;
  /** Explicit margin for MARGIN basis; falls back to deal price when absent. */
  marginMinorUnits?: bigint | null;
  grossOrderMinorUnits?: bigint | null;
  asOf?: Date;
}

export interface CommissionSnapshot {
  ruleId?: string | null;
  basis: CommissionBasisValue;
  rateBps: number;
  applicableAmountMinorUnits: bigint;
  commissionMinorUnits: bigint;
  minCommissionMinorUnits?: bigint | null;
  maxCommissionMinorUnits?: bigint | null;
}

export interface CommissionResult {
  commissionMinorUnits: bigint;
  snapshot: CommissionSnapshot;
  matchedRule: CommissionRule | null;
}

function inWindow(rule: CommissionRule, asOf: Date): boolean {
  if (rule.effectiveFrom != null && new Date(rule.effectiveFrom) > asOf) return false;
  if (rule.effectiveTo != null && new Date(rule.effectiveTo) < asOf) return false;
  return true;
}

/** Integer division with round-half-up (always on positive operands here). */
function readonlyHalfUpDiv(numerator: bigint, divisor: bigint): bigint {
  const quotient = numerator / divisor;
  const remainder = numerator % divisor;
  return remainder >= divisor / 2n ? quotient + 1n : quotient;
}

function specificity(rule: CommissionRule): number {
  let score = 0;
  if (rule.merchantId) score += 1000;
  if (rule.categoryId) score += 100;
  if (rule.regionKey) score += 10;
  return score;
}

export function selectCommissionRule(rules: CommissionRule[], input: CommissionInput): CommissionRule | null {
  const asOf = input.asOf ?? new Date();
  const active = rules
    .filter(r => inWindow(r, asOf))
    .filter(r => {
      if (r.merchantId && input.merchantId && r.merchantId !== input.merchantId) return false;
      if (r.regionKey && input.regionKey && r.regionKey !== input.regionKey) return false;
      if (r.categoryId && input.categoryId && r.categoryId !== input.categoryId) return false;
      return true;
    })
    .sort((a, b) => {
      const specDiff = specificity(b) - specificity(a);
      if (specDiff !== 0) return specDiff;
      const prioDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (prioDiff !== 0) return prioDiff;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });
  return active[0] ?? null;
}

export function computeCommission(rule: CommissionRule, input: CommissionInput): CommissionResult {
  const rateBps = BigInt(Math.max(0, Math.round(rule.rateBps)));
  const basisAmount = resolveBasisAmount(rule.basis, input, rateBps);
  let commission = percentOf(basisAmount, rateBps);

  if (rule.minCommissionMinorUnits != null && commission < rule.minCommissionMinorUnits) {
    commission = rule.minCommissionMinorUnits;
  }
  if (rule.maxCommissionMinorUnits != null && commission > rule.maxCommissionMinorUnits) {
    commission = rule.maxCommissionMinorUnits;
  }

  const snapshot: CommissionSnapshot = {
    ruleId: rule.id ?? null,
    basis: rule.basis,
    rateBps: rule.rateBps,
    applicableAmountMinorUnits: basisAmount,
    commissionMinorUnits: commission,
    minCommissionMinorUnits: rule.minCommissionMinorUnits ?? null,
    maxCommissionMinorUnits: rule.maxCommissionMinorUnits ?? null,
  };

  return { commissionMinorUnits: commission, snapshot, matchedRule: rule };
}

function resolveBasisAmount(basis: CommissionBasisValue, input: CommissionInput, rateBps: bigint): bigint {
  switch (basis) {
    case 'DEAL_PRICE':
      return input.dealPriceMinorUnits;
    case 'GROSS_ORDER':
      return (
        input.grossOrderMinorUnits ??
        (input.dealPriceMinorUnits + (input.shippingMinorUnits ?? 0n) + (input.taxMinorUnits ?? 0n))
      );
    case 'NET_ORDER': {
      const gross = input.grossOrderMinorUnits ?? (input.dealPriceMinorUnits + (input.shippingMinorUnits ?? 0n));
      const net = gross - (input.paymentFeeMinorUnits ?? 0n) - (input.marketingFeeMinorUnits ?? 0n);
      return net < 0n ? 0n : net;
    }
    case 'MERCHANT_PAYOUT': {
      // Commission on what the merchant would otherwise be due.
      // Closed form with a single half-up round: payout = base*10000/(10000+rate),
      // commission = base - payout — exactly self-consistent.
      const gross = input.grossOrderMinorUnits ?? (input.dealPriceMinorUnits + (input.shippingMinorUnits ?? 0n));
      const deductions = (input.paymentFeeMinorUnits ?? 0n) + (input.marketingFeeMinorUnits ?? 0n) + (input.taxMinorUnits ?? 0n);
      const payoutBeforeCommission = gross - deductions < 0n ? 0n : gross - deductions;
      const divisor = 10000n + rateBps;
      if (divisor <= 0n) return 0n;
      // The rate applies to the merchant's payout; commission = payout * rate.
      return readonlyHalfUpDiv(payoutBeforeCommission * 10000n, divisor);
    }
    case 'MARGIN':
      return input.marginMinorUnits ?? input.dealPriceMinorUnits;
    default:
      return input.dealPriceMinorUnits;
  }
}