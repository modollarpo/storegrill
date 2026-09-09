import type {
  CommissionRule as SharedCommissionRule,
} from '@Storegrill/shared';

/**
 * A minimal structural view of a Prisma CommissionRule row sufficient for
 * mapping to the shared engine's format. Field names deliberately differ from
 * the shared type (vendorId vs merchantId, startsAt/endsAt vs
 * effectiveFrom/effectiveTo, minAmountMinorUnits vs minCommissionMinorUnits).
 * `active` is optional because some call paths filter on it in the query
 * rather than selecting it.
 */
export interface PrismaCommissionRuleInput {
  id: string;
  name?: string;
  basis: string;
  rateBps: number;
  minAmountMinorUnits?: bigint | null;
  maxAmountMinorUnits?: bigint | null;
  maxRateBps?: number | null;
  vendorId: string | null;
  categoryId: string | null;
  regionKey: string | null;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active?: boolean;
}

/**
 * Maps a Prisma CommissionRule row to the shared engine's CommissionRule type.
 * Filters out inactive rules. Returns null when the rule must be excluded
 * (i.e. not active), so callers can filter the result.
 */
export function mapCommissionRuleToShared(
  rule: PrismaCommissionRuleInput,
): SharedCommissionRule | null {
  if (rule.active === false) return null;
  return {
    id: rule.id,
    merchantId: rule.vendorId,
    regionKey: rule.regionKey,
    categoryId: rule.categoryId,
    basis: rule.basis as SharedCommissionRule['basis'],
    rateBps: rule.rateBps,
    minCommissionMinorUnits: rule.minAmountMinorUnits ?? null,
    maxCommissionMinorUnits: rule.maxAmountMinorUnits ?? null,
    effectiveFrom: rule.startsAt,
    effectiveTo: rule.endsAt,
    priority: rule.priority,
  };
}

/**
 * Convenience: maps a list and drops inactive/empty results.
 */
export function mapCommissionRulesToShared(
  rules: PrismaCommissionRuleInput[],
): SharedCommissionRule[] {
  return rules
    .map(mapCommissionRuleToShared)
    .filter((r): r is SharedCommissionRule => r !== null);
}
