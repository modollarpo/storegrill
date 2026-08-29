import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import type { DealInput } from './deal-engine.js';

interface RawDeal {
  id: string;
  name: string;
  type: string;
  value: number;
  categoryIds: string;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  variants?: { productId: string }[];
}

function safeParseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function dealToInput(deal: RawDeal): DealInput {
  return {
    id: deal.id,
    name: deal.name,
    type: deal.type as DealInput['type'],
    value: deal.value,
    categoryIds: safeParseIds(deal.categoryIds),
    minOrderAmount: deal.minOrderAmount,
    maxDiscount: deal.maxDiscount,
    metadata:
      deal.type === 'FLASH_SALE' && deal.variants
        ? { flashProductIds: deal.variants.map(v => v.productId) }
        : null,
  };
}

export async function loadActiveDeals(
  prisma: PrismaClient = db,
  opts?: { vendorId?: string },
): Promise<DealInput[]> {
  const now = new Date();
  const deals = await prisma.deal.findMany({
    where: {
      enabled: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      ...(opts?.vendorId ? { vendorId: opts.vendorId } : {}),
    },
    include: { variants: { select: { productId: true } } },
  });
  return deals.map(dealToInput);
}
