import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { DEFAULT_REGIONS, parseStringList } from '@Storegrill/shared';

const router = Router();

router.get('/', async (_req: AuthRequest, res: Response) => {
  const regions = await prisma.region.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' },
    include: {
      taxRules: { where: { enabled: true } },
      shippingZones: { where: { enabled: true } },
    },
  });

  res.json({ regions });
});

router.get('/config', async (req: AuthRequest, res: Response) => {
  const regionKey = (req.query.key as string) || 'UK';

  const region = await prisma.region.findUnique({
    where: { key: regionKey },
    include: {
      taxRules: { where: { enabled: true } },
      shippingZones: { where: { enabled: true } },
    },
  });

  if (!region) {
    const defaultConfig = DEFAULT_REGIONS.find(r => r.key === regionKey);
    if (!defaultConfig) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Region not found' },
      });
    }
    return res.json({ region: defaultConfig });
  }

  res.json({ region });
});

router.get('/currencies', async (_req: AuthRequest, res: Response) => {
  const regions = await prisma.region.findMany({
    where: { enabled: true },
    select: { defaultCurrency: true, currencies: true },
  });

  const currencies = [...new Set(regions.flatMap((r: any) => {
    const parsed = parseStringList(r.currencies);
    return parsed.length > 0 ? parsed : [r.defaultCurrency].filter(Boolean);
  }))];
  res.json({ currencies });
});

router.get('/languages', async (_req: AuthRequest, res: Response) => {
  const regions = await prisma.region.findMany({
    where: { enabled: true },
    select: { defaultLanguage: true, languages: true },
  });

  const languages = [...new Set(regions.flatMap((r: any) => {
    const parsed = parseStringList(r.languages);
    return parsed.length > 0 ? parsed : [r.defaultLanguage].filter(Boolean);
  }))];
  res.json({ languages });
});

export { router as regionsRouter };
