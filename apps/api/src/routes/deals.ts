import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { optionalAuth, authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { CreateDealSchema, CreateCouponSchema, ApplyCouponSchema, DEFAULT_REGIONS } from '@Storegrill/shared';
import { slugify } from '../utils/slugify.js';
import { validateCoupon } from '../services/coupons.js';
import { loadActiveDeals } from '../services/deal-eval.js';
import { resolveProductPricing } from '../utils/pricing.js';
import { evaluateDealEconomics } from '../services/deal-valuation.js';
import { dealPriceFor, resolveListPrice } from '../services/deal-pricing.js';
import { mapCommissionRulesToShared } from '../services/commission-rule-mapper.js';
import { cache, TTL } from '../lib/cache.js';

const router = Router();

function getProductSelect(regionKey: string) {
  return {
    id: true,
    name: true,
    slug: true,
    thumbnail: true,
    basePriceMinorUnits: true,
    currencyCode: true,
    rating: true,
    regionPrices: { where: { regionKey }, take: 1, select: { regionKey: true, priceMinorUnits: true, currencyCode: true } },
  } as const;
}

function priceVariants(deal: any, regionKey: string): any[] {
  return (deal.variants ?? []).map((v: any) => {
    const { listPriceMinorUnits, currencyCode } = resolveListPrice(v.product, regionKey);
    const pricing = dealPriceFor(deal.type, Number(deal.value), listPriceMinorUnits);
    return {
      ...v,
      listPriceMinorUnits: pricing ? listPriceMinorUnits : null,
      priceMinorUnits: pricing ? pricing.priceMinorUnits : null,
      discountPercent: pricing ? pricing.discountPercent : 0,
      currencyCode,
    };
  });
}

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const regionKey = (req.query.regionKey as string) || 'UK';

  const deals = await prisma.deal.findMany({
    where: {
      enabled: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
      OR: [
        { regionKey: null },
        { regionKey },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      variants: {
        include: {
          product: { select: getProductSelect(regionKey) },
        },
      },
    },
  });

  res.json({
    deals: deals.map((d: any) => ({
      ...d,
      value: Number(d.value),
      variants: priceVariants(d, regionKey),
    })),
  });
});

router.get('/active', optionalAuth, async (req: AuthRequest, res: Response) => {
  const vendorId = req.query.vendorId as string | undefined;
  const deals = await loadActiveDeals(prisma, vendorId ? { vendorId } : undefined);
  res.json({ deals });
});

const DEAL_FILTERS = new Set(['all', 'flash', 'clearance', 'category', 'discount']);
const DEAL_SORTS = new Set(['savings', 'discountPercent', 'newest', 'price']);
const MAX_DEAL_FEED_OFFSET = 8000;

router.get('/products', optionalAuth, async (req: AuthRequest, res: Response) => {
  const regionKey = (req.query.regionKey as string) || 'UK';
  const filter = DEAL_FILTERS.has(String(req.query.filter)) ? String(req.query.filter) : 'all';
  const sort = DEAL_SORTS.has(String(req.query.sort)) ? String(req.query.sort) : 'savings';
  const offset = Math.min(Math.max(0, Number(req.query.offset) || 0), MAX_DEAL_FEED_OFFSET);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 24, 48));

  const cacheKey = `deals-products:${regionKey}:${filter}:${sort}:${offset}:${limit}`;
  const cached = cache.get<unknown>(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const activeDeals = await loadActiveDeals(prisma);

  const flashIds = new Set<string>();
  const categoryEntries: Array<{
    categoryId: string;
    vendorId: string | null;
    value: number;
    dealId: string;
    endsAt: string | null;
  }> = [];
  for (const deal of activeDeals) {
    if (deal.type === 'FLASH_SALE') {
      for (const id of deal.metadata?.flashProductIds ?? []) flashIds.add(id);
    } else if (deal.type === 'PERCENTAGE_OFF') {
      for (const categoryId of deal.categoryIds ?? []) {
        categoryEntries.push({
          categoryId,
          vendorId: deal.vendorId ?? null,
          value: deal.value,
          dealId: deal.id,
          endsAt: deal.endsAt ?? null,
        });
      }
    }
  }

  const or: any[] = [];
  if (filter === 'all' || filter === 'discount' || filter === 'flash') {
    if (flashIds.size > 0) or.push({ id: { in: [...flashIds] } });
  }
  if (filter === 'all' || filter === 'discount' || filter === 'clearance') {
    or.push({ tags: { contains: 'clearance' } });
  }
  if (filter === 'all' || filter === 'discount' || filter === 'category') {
    const catIds = new Set(categoryEntries.map(e => e.categoryId));
    if (catIds.size > 0) {
      const vendors = new Set<string>();
      let unscoped = false;
      for (const e of categoryEntries) {
        if (e.vendorId == null) unscoped = true;
        else vendors.add(e.vendorId);
      }
      or.push(
        unscoped
          ? { categoryId: { in: [...catIds] } }
          : { categoryId: { in: [...catIds] }, vendorId: { in: [...vendors] } },
      );
    }
  }

  if (or.length === 0) {
    const empty = { products: [], total: 0, hasMore: false };
    cache.set(cacheKey, empty, TTL.deals);
    res.setHeader('X-Cache', 'MISS');
    return res.json(empty);
  }

  const rows = await prisma.product.findMany({
    where: { status: 'ACTIVE', OR: or },
    include: {
      regionPrices: { where: { regionKey }, take: 1 },
      variants: true,
      category: { select: { id: true, name: true, slug: true } },
      vendor: { select: { id: true, slug: true, storeName: true } },
    },
  });

  const categoryBest = new Map<string, { value: number; endsAt: string | null }>();
  for (const e of categoryEntries) {
    const existing = categoryBest.get(e.categoryId);
    if (!existing || e.value > existing.value) {
      categoryBest.set(e.categoryId, { value: e.value, endsAt: e.endsAt });
    }
  }

  const items: any[] = [];
  for (const p of rows as any[]) {
    let tags: string[] = [];
    try {
      tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags;
    } catch {
      tags = [];
    }
    const pricing = resolveProductPricing(p, regionKey, activeDeals);
    if (
      pricing.discountPercent == null ||
      pricing.listPriceMinorUnits == null ||
      pricing.listPriceMinorUnits <= pricing.price
    ) {
      continue;
    }

    const sources = new Set<string>();
    if (flashIds.has(p.id)) sources.add('flash');
    if (tags.includes('clearance')) sources.add('clearance');
    if (categoryBest.has(p.categoryId)) sources.add('category');

    if (filter === 'flash' && !sources.has('flash')) continue;
    if (filter === 'clearance' && !sources.has('clearance')) continue;
    if (filter === 'category' && !sources.has('category')) continue;

    let label = 'SAVE';
    let endsAt: string | null = null;
    if (sources.has('flash')) {
      label = 'LIGHTNING';
    } else if (sources.has('category')) {
      label = `${categoryBest.get(p.categoryId)!.value}% OFF`;
      endsAt = categoryBest.get(p.categoryId)!.endsAt;
    } else if (sources.has('clearance')) {
      label = 'CLEARANCE';
    }

    const createdAt = p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? '');

    items.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      thumbnail: p.thumbnail,
      priceMinorUnits: pricing.price,
      listPriceMinorUnits: pricing.listPriceMinorUnits,
      discountPercent: pricing.discountPercent,
      currencyCode: pricing.currencyCode,
      dealLabel: label,
      endsAt,
      dealId: pricing.dealId ?? null,
      createdAt,
      categorySlug: p.category?.slug ?? null,
      vendorSlug: p.vendor?.slug ?? null,
    });
  }

  const sorters: Record<string, (a: any, b: any) => number> = {
    savings: (a, b) => b.listPriceMinorUnits - b.priceMinorUnits - (a.listPriceMinorUnits - a.priceMinorUnits),
    discountPercent: (a, b) => b.discountPercent - a.discountPercent,
    price: (a, b) => a.priceMinorUnits - b.priceMinorUnits,
    newest: (a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0),
  };
  items.sort(sorters[sort] ?? sorters.savings);

  const total = items.length;
  const page = items.slice(offset, offset + limit);
  const payload = { products: page, total, hasMore: offset + limit < total };
  cache.set(cacheKey, payload, TTL.deals);
  res.setHeader('X-Cache', 'MISS');
  res.json(payload);
});

router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const regionKey = (req.query.regionKey as string) || 'UK';

  const deal = await prisma.deal.findUnique({
    where: { slug },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      variants: {
        include: {
          product: {
            select: { ...getProductSelect(regionKey), reviewCount: true },
          },
        },
      },
      coupons: { where: { enabled: true } },
    },
  });

  if (!deal) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Deal not found' },
    });
  }

  res.json({
    deal: {
      ...deal,
      value: Number(deal.value),
      variants: priceVariants(deal, regionKey),
    },
  });
});

router.post('/', authenticate, authorize('VENDOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const body = CreateDealSchema.parse(req.body);

  const slug = slugify(body.name);
  const existingSlug = await prisma.deal.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const { regionKey, categoryIds, vendorId, metadata, ...rest } = body;

  const deal = await prisma.deal.create({
    data: {
      ...rest,
      slug: finalSlug,
      value: body.value,
      minOrderAmount: body.minOrderAmount || null,
      maxDiscount: body.maxDiscount || null,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      categoryIds: JSON.stringify(categoryIds || []),
      ...(regionKey && { region: { connect: { key: regionKey } } }),
      ...(vendorId && { vendor: { connect: { id: vendorId } } }),
    },
  });

  res.status(201).json({ deal: { ...deal, value: Number(deal.value) } });
});

router.post('/apply-coupon', optionalAuth, async (req: AuthRequest, res: Response) => {
  const body = ApplyCouponSchema.parse(req.body);
  const region = DEFAULT_REGIONS.find(r => r.key === body.regionKey);
  const currencyCode = region?.defaultCurrency ?? 'USD';
  const result = await validateCoupon(body.code, body.subtotalMinorUnits, currencyCode, body.items);

  if (!result.ok) {
    return res.status(result.status).json({ error: { code: result.code, message: result.message } });
  }

  res.json({
    coupon: {
      code: result.coupon.code,
      dealName: result.coupon.dealName,
      dealType: result.coupon.dealType,
      discountMinorUnits: result.coupon.discountMinorUnits,
    },
  });
});

const EVALUATE_DEAL_SCHEMA = z.object({
  rrpMinorUnits: z.number().int().nonnegative(),
  dealPriceMinorUnits: z.number().int().nonnegative(),
  shippingRevenueMinorUnits: z.number().int().nonnegative().optional(),
  taxMinorUnits: z.number().int().nonnegative().optional(),
  paymentFeeMinorUnits: z.number().int().nonnegative().optional(),
  estimatedFulfilmentCostMinorUnits: z.number().int().nonnegative().optional(),
  refundReserveMinorUnits: z.number().int().nonnegative().optional(),
  regionKey: z.string().optional(),
  categoryId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageCount: z.number().int().nonnegative().optional(),
  merchantRating: z.number().min(0).max(5).optional(),
  availability: z.enum(['UNLIMITED', 'PLENTY', 'LOW', 'SOLD_OUT']).optional(),
  stockRemaining: z.number().int().nonnegative().optional(),
  purchaseCap: z.number().int().nonnegative().optional(),
});

router.post('/evaluate', optionalAuth, async (req: AuthRequest, res: Response) => {
  const body = EVALUATE_DEAL_SCHEMA.parse(req.body);
  const rules = await prisma.commissionRule.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      basis: true,
      rateBps: true,
      minAmountMinorUnits: true,
      maxAmountMinorUnits: true,
      maxRateBps: true,
      vendorId: true,
      categoryId: true,
      regionKey: true,
      priority: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const evaluation = evaluateDealEconomics({
    ...body,
    commissionRules: mapCommissionRulesToShared(rules),
  });

  res.json({ evaluation });
});

export { router as dealsRouter };
