import { Router, Request, Response } from 'express';
import {
  HERO_MAX_BANNER_SLIDES,
  bannerOrder,
  campaignCreativeToSlide,
  type BannerSlide,
} from '../services/banner-mapping.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const regionKey =
    typeof req.query.regionKey === 'string' && req.query.regionKey.trim()
      ? req.query.regionKey.trim()
      : 'UK';
  const now = new Date();

  const { prisma } = await import('../index.js');
  const rows = await prisma.campaignCreative.findMany({
    where: {
      type: 'BANNER',
      status: 'ACTIVE',
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const candidates: Array<{ order: number; createdAt: number; slide: BannerSlide }> = [];
  for (const row of rows) {
    const slide = campaignCreativeToSlide(row, regionKey);
    if (!slide) continue;
    candidates.push({
      order: bannerOrder(row),
      createdAt: new Date(row.createdAt).getTime(),
      slide,
    });
  }
  candidates.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);

  res.json({
    regionKey,
    slides: candidates.slice(0, HERO_MAX_BANNER_SLIDES).map(c => c.slide),
  });
});

export { router as bannersRouter };