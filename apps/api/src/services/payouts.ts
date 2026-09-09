import { prisma } from '../db/prisma.js';
import { recordPayoutLedger } from './ledger-entries.js';
import { calculatePayout, toBasisPoints } from '@Storegrill/shared';

export function periodOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface GroupedItem {
  id: string;
  totalMinorUnits: number;
  commissionMinorUnits: number;
}

interface PayoutGroup {
  currencyCode: string;
  itemIds: GroupedItem[];
  revenueSharePct: number;
  fixedFeeMinorUnits: number;
}

interface ComputeGroupPayoutInput {
  items: GroupedItem[];
  revenueSharePct: number;
  fixedFeeMinorUnits: number;
  currencyCode: string;
}

/**
 * Pure payout computation for one (vendor, currency) group. Money math lives in
 * the shared engine: order-time commission snapshots win when present, otherwise
 * the vendor's flat revenue share is applied in basis points. No float money.
 */
export function computeGroupPayout(input: ComputeGroupPayoutInput) {
  return calculatePayout(
    input.items.map(item => ({
      id: item.id,
      amountMinorUnits: item.totalMinorUnits,
      commissionOverrideMinorUnits: item.commissionMinorUnits >= 0 ? item.commissionMinorUnits : undefined,
    })),
    {
      revenueShareBps: toBasisPoints(input.revenueSharePct),
      fixedFeeMinorUnits: input.fixedFeeMinorUnits,
      currencyCode: input.currencyCode,
    },
  );
}

/**
 * Generates PENDING payouts for all DELIVERED order items not yet referenced by
 * any PayoutLine, grouped by (vendor, currency) for the given period. Idempotent:
 * items already attached to a payout line are skipped, so repeated runs never
 * double-pay. Returns the number of payouts created.
 *
 * Commission per item comes from the immutable order-time snapshot recorded on
 * the OrderItem at checkout (commissionMinorUnits, resolved from the
 * CommissionRule engine). Items without a snapshot (legacy orders) fall back to
 * the vendor's flat revenueSharePct, keeping historical payout math stable.
 */
export async function generatePayouts(period: string = periodOf()): Promise<number> {
  const existingLines = await prisma.payoutLine.findMany({ select: { orderItemId: true } });
  const paidItemIds = new Set(existingLines.map(l => l.orderItemId));

  const items = await prisma.orderItem.findMany({
    where: { order: { status: 'DELIVERED' } },
    select: {
      id: true,
      totalMinorUnits: true,
      commissionMinorUnits: true,
      vendorId: true,
      order: { select: { currencyCode: true } },
      vendor: { select: { revenueSharePct: true, fixedFeeMinorUnits: true } },
    },
  });

  const vendors = new Map<string, { revenueSharePct: number; fixedFeeMinorUnits: number }>();
  for (const item of items) {
    if (item.vendor) vendors.set(item.vendorId, {
      revenueSharePct: item.vendor.revenueSharePct,
      fixedFeeMinorUnits: item.vendor.fixedFeeMinorUnits,
    });
  }

  const groups = new Map<string, PayoutGroup>();

  for (const item of items) {
    if (paidItemIds.has(item.id)) continue;
    const key = `${item.vendorId}:${item.order.currencyCode}`;
    const vendor = vendors.get(item.vendorId);
    const group = groups.get(key) ?? {
      currencyCode: item.order.currencyCode,
      itemIds: [],
      revenueSharePct: vendor?.revenueSharePct ?? 12,
      fixedFeeMinorUnits: vendor?.fixedFeeMinorUnits ?? 30,
    };
    group.itemIds.push({
      id: item.id,
      totalMinorUnits: item.totalMinorUnits,
      commissionMinorUnits: item.commissionMinorUnits != null ? Number(item.commissionMinorUnits) : -1,
    });
    groups.set(key, group);
  }

  let created = 0;
  for (const [key, group] of groups) {
    const [vendorId] = key.split(':');

    const result = computeGroupPayout({
      items: group.itemIds,
      revenueSharePct: group.revenueSharePct,
      fixedFeeMinorUnits: group.fixedFeeMinorUnits,
      currencyCode: group.currencyCode,
    });

    const totalPayoutMinorUnits = result.totalPayoutMinorUnits;
    const totalCommissionMinorUnits = result.totalCommissionMinorUnits;

    let payoutId = '';
    await prisma.$transaction(async tx => {
      const payout = await tx.payout.create({
        data: {
          vendorId,
          amountMinorUnits: totalPayoutMinorUnits,
          currencyCode: group.currencyCode,
          status: 'PENDING',
          period,
        },
      });
      payoutId = payout.id;
      await tx.payoutLine.createMany({
        data: result.lines.map(line => ({
          payoutId: payout.id,
          orderItemId: line.orderItemId,
          amount: line.payoutAmount,
          commission: line.commission,
          fixedFee: line.fixedFee,
        })),
      });
    });
    await recordPayoutLedger({
      referenceId: payoutId,
      currencyCode: group.currencyCode,
      commissionMinorUnits: BigInt(totalCommissionMinorUnits),
      payoutMinorUnits: BigInt(totalPayoutMinorUnits),
    });
    created += 1;
  }

  return created;
}