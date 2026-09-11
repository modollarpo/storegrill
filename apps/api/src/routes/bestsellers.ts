import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { regionKey, limit = '12' } = req.query;

  const where: any = {
    status: 'ACTIVE',
    variants: { some: { stock: { gt: 0 } } },
  };

  if (regionKey) {
    where.vendor = {
      shippingZones: { some: { regionKey: regionKey as string } },
    };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { reviewCount: 'desc' },
    take: Math.min(parseInt(limit as string) || 12, 24),
    include: {
      vendor: { select: { id: true, storeName: true, slug: true, verified: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  res.json({ products });
});

router.get('/category/:categorySlug', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { categorySlug } = req.params;
  const { regionKey, limit = '6' } = req.query;

  const where: any = {
    status: 'ACTIVE',
    category: { slug: categorySlug },
    variants: { some: { stock: { gt: 0 } } },
  };

  if (regionKey) {
    where.vendor = {
      shippingZones: { some: { regionKey: regionKey as string } },
    };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { reviewCount: 'desc' },
    take: Math.min(parseInt(limit as string) || 6, 12),
    include: {
      vendor: { select: { id: true, storeName: true, slug: true, verified: true } },
    },
  });

  res.json({ products });
});

export { router as bestsellersRouter };
