import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const newsletterRouter = Router();

// POST /api/v1/newsletter/subscribe
newsletterRouter.post('/subscribe', async (req, res) => {
  const { email, regionKey } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { message: 'Valid email required' } });
  }
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { regionKey: regionKey ?? undefined, unsubscribedAt: null },
    create: { email, regionKey: regionKey ?? undefined },
  });
  return res.json({ ok: true });
});

// POST /api/v1/newsletter/unsubscribe
newsletterRouter.post('/unsubscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: { message: 'Email required' } });
  await prisma.newsletterSubscriber.updateMany({ where: { email }, data: { unsubscribedAt: new Date() } });
  return res.json({ ok: true });
});
