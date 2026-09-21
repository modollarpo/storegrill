import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { sendPushBroadcast, sendPushToRegion, sendPushToUser, pushConfigured } from '../services/push.js';

const router = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  regionKey: z.string().min(1).max(10).optional(),
});

router.get('/vapid-public-key', (_req, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? '';
  res.json({ publicKey: key, configured: Boolean(key) });
});

router.post('/subscribe', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys, regionKey } = subscriptionSchema.parse(req.body);

  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  const data = {
    userId: req.user?.id ?? existing?.userId ?? null,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    regionKey: regionKey ?? existing?.regionKey ?? null,
  };

  const subscription = existing
    ? await prisma.pushSubscription.update({ where: { id: existing.id }, data: { ...data, userId: existing.userId ?? req.user?.id ?? null } })
    : await prisma.pushSubscription.create({ data });

  res.json({ subscription });
});

router.delete('/unsubscribe', optionalAuth, async (req: AuthRequest, res: Response) => {
  const body = z.object({ endpoint: z.string().url() }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  res.json({ success: true });
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: req.user!.id } });
  res.json({ subscriptions: subs });
});

router.post('/send', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    title: z.string().min(1).max(120),
    body: z.string().max(500).optional(),
    url: z.string().url().optional(),
    scope: z.enum(['user', 'region', 'broadcast']).default('user'),
    userId: z.string().optional(),
    regionKey: z.string().min(1).max(10).optional(),
  }).parse(req.body);

  if (!pushConfigured) {
    return res.status(503).json({ error: { code: 'PUSH_NOT_CONFIGURED', message: 'VAPID keys are not configured' } });
  }

  const payload = { title: body.title, body: body.body, url: body.url };

  if (body.scope === 'broadcast') {
    const result = await sendPushBroadcast(payload);
    return res.json(result);
  }
  if (body.scope === 'region') {
    if (!body.regionKey) return res.status(400).json({ error: { code: 'VALIDATION', message: 'regionKey is required' } });
    const result = await sendPushToRegion(body.regionKey, payload);
    return res.json(result);
  }

  const targetUserId = body.userId ?? req.user!.id;
  const result = await sendPushToUser(targetUserId, payload);
  res.json(result);
});

export { router as pushRouter };