import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    unreadOnly: z.enum(['true', 'false']).optional().default('false'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }).parse(req.query);

  const where = {
    userId: req.user!.id,
    ...(query.unreadOnly === 'true' ? { read: false } : {})
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  });

  res.json({ notifications });
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user!.id }
  });

  if (!notification) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true }
  });

  res.json({ success: true });
});

export { router as notificationsRouter };
