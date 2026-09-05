import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const CreateCampaignSchema = z.object({
  name: z.string().min(2).max(150),
  channel: z.string().min(2).max(50),
  budgetMinorUnits: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const TrackEventSchema = z.object({
  campaignId: z.string().optional(),
  channel: z.string().min(1),
  eventType: z.enum(['IMPRESSION', 'CLICK', 'CONVERSION']),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { status: 'LIVE' },
    orderBy: { createdAt: 'desc' },
    include: { vendor: { select: { storeName: true, slug: true } } },
  });
  res.json({ campaigns });
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const body = CreateCampaignSchema.parse(req.body);
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
  }

  const campaign = await prisma.marketingCampaign.create({
    data: {
      vendorId: vendor.id,
      name: body.name,
      channel: body.channel,
      budgetMinorUnits: body.budgetMinorUnits ?? 0,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      status: 'LIVE',
    },
  });

  res.status(201).json({ campaign });
});

router.post('/events', async (req: AuthRequest, res: Response) => {
  const body = TrackEventSchema.parse(req.body);
  const event = await prisma.marketingEvent.create({
    data: {
      campaignId: body.campaignId || null,
      channel: body.channel,
      eventType: body.eventType,
      metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
    },
  });

  res.status(201).json({ eventId: event.id });
});

export { router as marketingCampaignsRouter };
