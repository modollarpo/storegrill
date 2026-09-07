import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { optionalAuth, authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { CreateDealSchema, CreateCouponSchema, ApplyCouponSchema, DEFAULT_REGIONS } from '@Storegrill/shared';
import { slugify } from '../utils/slugify.js';
import { validateCoupon } from '../services/coupons.js';
import { loadActiveDeals } from '../services/deal-eval.js';
import { evaluateDealEconomics } from '../services/deal-valuation.js';
import { dealPriceFor, resolveListPrice } from '../services/deal-pricing.js';

const router = Router();

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  thumbnail: true,
  basePriceMinorUnits: true,
  currencyCode: true,
  rating: true,
  regionPrices: { select: { priceMinorUnits: true, currencyCode: true } },
} as const;

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
          product: { select: PRODUCT_SELECT },
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
            select: { ...PRODUCT_SELECT, reviewCount: true },
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
    commissionRules: rules as any,
  });

  res.json({ evaluation });
});

export { router as dealsRouter };
