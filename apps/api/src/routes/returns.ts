import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const CreateReturnSchema = z.object({
  orderId: z.string().min(1),
  orderItemId: z.string().optional(),
  reason: z.string().min(3).max(500),
});

const UpdateReturnSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'ITEM_RECEIVED', 'REFUNDED', 'CLOSED']),
  resolution: z.string().max(1000).optional(),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const body = CreateReturnSchema.parse(req.body);
  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    select: { id: true, userId: true },
  });

  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  const returnReq = await prisma.returnRequest.create({
    data: {
      orderId: body.orderId,
      orderItemId: body.orderItemId || null,
      reason: body.reason,
      status: 'SUBMITTED',
    },
  });

  res.status(201).json({ returnRequest: returnReq });
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';

  const where = isAdmin
    ? {}
    : { order: { userId } };

  const returns = await prisma.returnRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { orderNumber: true, totalMinorUnits: true, currencyCode: true } } },
  });

  res.json({ returns });
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  const body = UpdateReturnSchema.parse(req.body);
  const existing = await prisma.returnRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Return request not found' } });
  }

  const updated = await prisma.returnRequest.update({
    where: { id: req.params.id },
    data: {
      status: body.status,
      resolution: body.resolution ?? existing.resolution,
    },
  });

  res.json({ returnRequest: updated });
});

export { router as returnsRouter };
