import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { optionalAuth, authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { CreateDealSchema, CreateCouponSchema, ApplyCouponSchema, DEFAULT_REGIONS } from '@Storegrill/shared';
import { slugify } from '../utils/slugify.js';
import { validateCoupon } from '../services/coupons.js';
import { loadActiveDeals } from '../services/deal-eval.js';

const router = Router();

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
          product: {
            select: {
              id: true, name: true, slug: true, thumbnail: true,
              basePriceMinorUnits: true, currencyCode: true, rating: true,
            },
          },
        },
      },
    },
  });

  res.json({
    deals: deals.map((d: any) => ({
      ...d,
      value: Number(d.value),
      variants: d.variants.map((v: any) => ({
        ...v,
        product: {
          ...v.product,
          basePriceMinorUnits: Number(v.product.basePriceMinorUnits),
          rating: Number(v.product.rating),
        },
      })),
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

  const deal = await prisma.deal.findUnique({
    where: { slug },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      variants: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, thumbnail: true,
              basePriceMinorUnits: true, currencyCode: true, rating: true,
              reviewCount: true,
            },
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
      variants: deal.variants.map((v: any) => ({
        ...v,
        product: {
          ...v.product,
          basePriceMinorUnits: Number(v.product.basePriceMinorUnits),
          rating: Number(v.product.rating),
        },
      })),
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

export { router as dealsRouter };
