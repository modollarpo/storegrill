import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import {
  selectCommissionRule,
  computeCommission,
  type CommissionInput,
  type CommissionRule as SharedCommissionRule,
  type CommissionSnapshot as SharedCommissionSnapshot,
} from '@Storegrill/shared';
import { mapCommissionRulesToShared } from './commission-rule-mapper.js';

export interface CommissionSnapshotInput {
  merchantId: string;
  regionKey: string;
  categoryId?: string | null;
  dealPriceMinorUnits: bigint;
  shippingMinorUnits?: bigint;
  taxMinorUnits?: bigint;
}

export interface ResolvedCommission {
  commissionMinorUnits: bigint;
  snapshot: SharedCommissionSnapshot;
  ruleId: string | null;
}

/**
 * Loads all CommissionRules applicable to a merchant's order (merchant-scoped
 * or global, and optionally region-scoped). Returns them in a shared format
 * ready for in-memory selection.
 */
export async function loadCommissionRules(
  merchantId: string,
  regionKey?: string,
  prisma: PrismaClient = db,
): Promise<SharedCommissionRule[]> {
  const rules = await prisma.commissionRule.findMany({
    where: {
      AND: [
        { OR: [{ vendorId: null }, { vendorId: merchantId }] },
        ...(regionKey ? [{ OR: [{ regionKey: null }, { regionKey }] }] : []),
      ],
    },
  });
  return mapCommissionRulesToShared(rules);
}

/**
 * Resolves the marketplace commission for a single order item against an
 * already-loaded ruleset. Pure — no I/O. Returns the commission plus an
 * immutable snapshot to persist with the order.
 */
export function resolveCommissionFromRules(
  rules: SharedCommissionRule[],
  input: CommissionSnapshotInput,
): ResolvedCommission | null {
  if (rules.length === 0) return null;

  const commissionInput: CommissionInput = {
    merchantId: input.merchantId,
    regionKey: input.regionKey,
    categoryId: input.categoryId,
    dealPriceMinorUnits: input.dealPriceMinorUnits,
    shippingMinorUnits: input.shippingMinorUnits ?? 0n,
    taxMinorUnits: input.taxMinorUnits ?? 0n,
  };

  const matched = selectCommissionRule(rules, commissionInput);
  if (!matched) return null;

  const result = computeCommission(matched, commissionInput);
  return {
    commissionMinorUnits: result.commissionMinorUnits,
    snapshot: result.snapshot,
    ruleId: matched.id ?? null,
  };
}

export function snapshotToJson(snapshot: SharedCommissionSnapshot): string {
  return JSON.stringify({
    ruleId: snapshot.ruleId ?? null,
    basis: snapshot.basis,
    rateBps: snapshot.rateBps,
    applicableAmountMinorUnits: snapshot.applicableAmountMinorUnits.toString(),
    commissionMinorUnits: snapshot.commissionMinorUnits.toString(),
    minCommissionMinorUnits: snapshot.minCommissionMinorUnits != null ? snapshot.minCommissionMinorUnits.toString() : null,
    maxCommissionMinorUnits: snapshot.maxCommissionMinorUnits != null ? snapshot.maxCommissionMinorUnits.toString() : null,
  });
}
