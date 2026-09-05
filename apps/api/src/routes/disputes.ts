import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const CreateDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(1000),
});

const UpdateDisputeSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED']),
  resolution: z.string().max(1000).optional(),
});

const EvidenceSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  url: z.string().url(),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const body = CreateDisputeSchema.parse(req.body);
  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    select: { id: true, userId: true },
  });

  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  const dispute = await prisma.dispute.create({
    data: {
      orderId: body.orderId,
      customerId: req.user!.id,
      reason: body.reason,
      status: 'OPEN',
    },
  });

  res.status(201).json({ dispute });
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';

  const where = isAdmin ? {} : { customerId: userId };

  const disputes = await prisma.dispute.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      order: { select: { orderNumber: true, totalMinorUnits: true, currencyCode: true } },
      evidence: true,
    },
  });

  res.json({ disputes });
});

router.post('/:id/evidence', authenticate, async (req: AuthRequest, res: Response) => {
  const body = EvidenceSchema.parse(req.body);
  const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
  if (!dispute) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dispute not found' } });
  }

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      fileName: body.fileName,
      mimeType: body.mimeType,
      url: body.url,
      uploadedBy: req.user!.id,
    },
  });

  res.status(201).json({ evidence });
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  const body = UpdateDisputeSchema.parse(req.body);
  const existing = await prisma.dispute.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dispute not found' } });
  }

  const updated = await prisma.dispute.update({
    where: { id: req.params.id },
    data: {
      status: body.status,
      resolution: body.resolution ?? existing.resolution,
      closedAt: body.status === 'RESOLVED' || body.status === 'CLOSED' ? new Date() : null,
    },
  });

  res.json({ dispute: updated });
});

export { router as disputesRouter };
