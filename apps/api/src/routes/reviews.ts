import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, authorize, AuthRequest, requireVerifiedEmail } from '../middleware/auth.js';
import { CreateReviewSchema } from '@storegrill/shared';

const router = Router();

router.get('/product/:productId', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { productId } = req.params;
  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }).parse(req.query);

  const [reviews, total, stats] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.review.count({ where: { productId, status: 'APPROVED' } }),
    prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const distribution = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId, status: 'APPROVED' },
    _count: { rating: true },
  });

  res.json({
    reviews: reviews.map(r => ({ ...r, user: r.user })),
    stats: {
      average: Number(stats._avg.rating) || 0,
      total: stats._count.rating,
      distribution: Array.from({ length: 5 }, (_, i) => ({
        rating: 5 - i,
        count: distribution.find(d => d.rating === 5 - i)?._count.rating || 0,
      })),
    },
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

router.post('/', authenticate, requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const body = CreateReviewSchema.parse(req.body);

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId: body.productId } },
  });

  if (existing) {
    return res.status(409).json({
      error: { code: 'REVIEW_EXISTS', message: 'You have already reviewed this product' },
    });
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      orderId: { not: '' },
      product: { id: body.productId },
      order: { userId: req.user!.id, status: 'DELIVERED' },
    },
  });

  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      productId: body.productId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      images: JSON.stringify(body.images || []),
      verified: !!orderItem,
      status: 'APPROVED',
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  const stats = await prisma.review.aggregate({
    where: { productId: body.productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: body.productId },
    data: {
      rating: Number(stats._avg.rating) || 0,
      reviewCount: stats._count.rating,
    },
  });

  res.status(201).json({ review });
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Review not found' },
    });
  }

  if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Not your review' },
    });
  }

  const body = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(200).optional(),
    body: z.string().max(5000).optional(),
    images: z.array(z.string().url()).max(10).optional(),
  }).parse(req.body);

  const review = await prisma.review.update({
    where: { id },
    data: {
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.images !== undefined && { images: JSON.stringify(body.images) }),
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  res.json({ review });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Review not found' },
    });
  }

  if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Not your review' },
    });
  }

  await prisma.review.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/reply', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ reply: z.string().min(1).max(2000) }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { vendorId: true } } },
  });

  if (!review) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Review not found' },
    });
  }

  if (review.product.vendorId !== vendor.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Not your product review' },
    });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { vendorReply: body.reply },
  });

  res.json({ review: updated });
});

export { router as reviewsRouter };
