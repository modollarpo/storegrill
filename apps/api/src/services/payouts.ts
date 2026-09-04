import { prisma } from '../index.js';
import { calculatePayout } from '@Storegrill/shared';

export function periodOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface GroupedItem {
  id: string;
  totalMinorUnits: number;
}

interface PayoutGroup {
  currencyCode: string;
  itemIds: GroupedItem[];
  revenueSharePct: number;
  fixedFeeMinorUnits: number;
}

/**
 * Generates PENDING payouts for all DELIVERED order items not yet referenced by
 * any PayoutLine, grouped by (vendor, currency) for the given period. Idempotent:
 * items already attached to a payout line are skipped, so repeated runs never
 * double-pay. Returns the number of payouts created.
 */
export async function generatePayouts(period: string = periodOf()): Promise<number> {
  const existingLines = await prisma.payoutLine.findMany({ select: { orderItemId: true } });
  const paidItemIds = new Set(existingLines.map(l => l.orderItemId));

  const items = await prisma.orderItem.findMany({
    where: { order: { status: 'DELIVERED' } },
    select: {
      id: true,
      totalMinorUnits: true,
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
    group.itemIds.push(item);
    groups.set(key, group);
  }

  let created = 0;
  for (const [key, group] of groups) {
    const [vendorId] = key.split(':');
    const result = calculatePayout(
      group.itemIds.map(item => ({ id: item.id, amountMinorUnits: item.totalMinorUnits })),
      {
        revenueSharePct: group.revenueSharePct,
        fixedFeeMinorUnits: group.fixedFeeMinorUnits,
        currencyCode: group.currencyCode,
      },
    );

    await prisma.$transaction(async tx => {
      const payout = await tx.payout.create({
        data: {
          vendorId,
          amountMinorUnits: result.totalPayoutMinorUnits,
          currencyCode: group.currencyCode,
          status: 'PENDING',
          period,
        },
      });
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
    created += 1;
  }

  return created;
}