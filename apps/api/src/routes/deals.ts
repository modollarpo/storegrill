import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { optionalAuth, authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { CreateDealSchema, CreateCouponSchema, ApplyCouponSchema } from '@storegrill/shared';
import { slugify } from '../utils/slugify.js';

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
    deals: deals.map(d => ({
      ...d,
      value: Number(d.value),
      variants: d.variants.map(v => ({
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
      variants: deal.variants.map(v => ({
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

  const { regionKey, categoryIds, vendorId, ...rest } = body;

  const deal = await prisma.deal.create({
    data: {
      ...rest,
      slug: finalSlug,
      value: body.value,
      minOrderAmount: body.minOrderAmount || null,
      maxDiscount: body.maxDiscount || null,
      categoryIds: JSON.stringify(categoryIds || []),
      ...(regionKey && { region: { connect: { key: regionKey } } }),
      ...(vendorId && { vendor: { connect: { id: vendorId } } }),
    },
  });

  res.status(201).json({ deal: { ...deal, value: Number(deal.value) } });
});

router.post('/apply-coupon', optionalAuth, async (req: AuthRequest, res: Response) => {
  const body = ApplyCouponSchema.parse(req.body);

  const coupon = await prisma.coupon.findUnique({
    where: { code: body.code },
    include: { deal: true },
  });

  if (!coupon || !coupon.enabled) {
    return res.status(404).json({
      error: { code: 'INVALID_COUPON', message: 'Invalid or expired coupon code' },
    });
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.status(400).json({
      error: { code: 'COUPON_EXPIRED', message: 'Coupon has expired' },
    });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({
      error: { code: 'COUPON_EXHAUSTED', message: 'Coupon has been fully used' },
    });
  }

  if (!coupon.deal.enabled || coupon.deal.startsAt > new Date() || coupon.deal.endsAt < new Date()) {
    return res.status(400).json({
      error: { code: 'DEAL_INACTIVE', message: 'Deal is not currently active' },
    });
  }

  if (coupon.deal.minOrderAmount && body.subtotalMinorUnits < Number(coupon.deal.minOrderAmount)) {
    return res.status(400).json({
      error: { code: 'MIN_ORDER_NOT_MET', message: `Minimum order amount not met` },
    });
  }

  let discount = 0;
  if (coupon.deal.type === 'PERCENTAGE_OFF') {
    discount = Math.round(body.subtotalMinorUnits * Number(coupon.deal.value) / 100);
    if (coupon.deal.maxDiscount) {
      discount = Math.min(discount, Number(coupon.deal.maxDiscount));
    }
  } else if (coupon.deal.type === 'FIXED_AMOUNT') {
    discount = Number(coupon.deal.value) * 100;
  }

  res.json({
    coupon: {
      code: coupon.code,
      dealName: coupon.deal.name,
      dealType: coupon.deal.type,
      discountMinorUnits: discount,
    },
  });
});

export { router as dealsRouter };
