import { Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { trackEvent, trackBatch, getSummary, getTopEntities, getUserEvents } from '../services/analytics.js';
import { sendPinterestCapiEvent } from '../services/pinterest-capi.js';
import { createAsyncRouter } from '../middleware/asyncRouter.js';

const router = createAsyncRouter();

const eventSchema = z.object({
  eventType: z.string().min(1),
  sessionId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  value: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  region: z.string().optional(),
  eventId: z.string().optional(),
  currency: z.string().optional(),
  searchTerm: z.string().optional(),
});

router.post('/event', async (req: AuthRequest, res: Response) => {
  const body = eventSchema.parse(req.body);

  const { prisma } = await import('../index.js');
  const event = await trackEvent({
    ...body,
    userId: req.user?.id,
  }, prisma);

  const metadata = body.metadata ?? {};
  const items = Array.isArray(metadata.items)
    ? (metadata.items as Array<{ id?: unknown; name?: unknown; qty?: unknown; price?: unknown }>)
        .filter(i => typeof i.id === 'string')
        .map(i => ({
          id: i.id as string,
          name: typeof i.name === 'string' ? i.name : undefined,
          qty: typeof i.qty === 'number' ? i.qty : undefined,
          price: typeof i.price === 'number' ? i.price : undefined,
        }))
    : undefined;

  sendPinterestCapiEvent({
    eventId: body.eventId ?? event.id,
    eventType: body.eventType,
    value: body.value,
    currency: body.currency,
    searchTerm: body.searchTerm,
    orderId: typeof metadata.orderNumber === 'string' ? metadata.orderNumber : undefined,
    items,
    sessionId: body.sessionId,
    clientIp: req.ip,
    clientUserAgent: req.headers['user-agent'],
  }).catch(() => {});

  res.status(201).json({ event });
});

router.post('/batch', async (req: AuthRequest, res: Response) => {
  const body = z.object({
    events: z.array(eventSchema).min(1).max(100),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const result = await trackBatch(
    body.events.map(e => ({ ...e, userId: req.user?.id })),
    prisma,
  );
  res.status(201).json({ count: result.count });
});

router.get('/summary', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const eventType = req.query.eventType as string;
  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);

  if (!eventType || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'eventType, startDate, endDate required' });
    return;
  }

  const { prisma } = await import('../index.js');
  const summary = await getSummary(eventType, startDate, endDate, undefined, prisma);
  res.json({ summary });
});

router.get('/top-entities', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const eventType = req.query.eventType as string;
  const entityType = req.query.entityType as string;
  const startDate = new Date(req.query.startDate as string);
  const endDate = new Date(req.query.endDate as string);
  const limit = parseInt(req.query.limit as string) || 10;

  if (!eventType || !entityType || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'eventType, entityType, startDate, endDate required' });
    return;
  }

  const { prisma } = await import('../index.js');
  const top = await getTopEntities(eventType, entityType, startDate, endDate, limit, prisma);
  res.json({ top });
});

router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const limit = parseInt(req.query.limit as string) || 50;
  const events = await getUserEvents(req.params.userId, limit, prisma);
  res.json({ events });
});

export { router as analyticsRouter };
