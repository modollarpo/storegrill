import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { createFlag, updateFlag, getFlag, isFlagEnabled, deleteFlag, listFlags } from '../services/feature-flags.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const flags = await listFlags(prisma);
  res.json({ flags });
});

router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    key: z.string().min(1).regex(/^[a-z0-9._-]+$/),
    name: z.string().min(1),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    rolloutPct: z.number().int().min(0).max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const flag = await createFlag(body, prisma);
  res.status(201).json({ flag });
});

router.put('/:key', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    rolloutPct: z.number().int().min(0).max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const flag = await updateFlag(req.params.key, body, prisma);
  res.json({ flag });
});

router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const flag = await getFlag(req.params.key, prisma);
  if (!flag) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ flag });
});

router.get('/:key/check', authenticate, async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const enabled = await isFlagEnabled(req.params.key, req.user?.id, prisma);
  res.json({ key: req.params.key, enabled });
});

router.delete('/:key', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  await deleteFlag(req.params.key, prisma);
  res.status(204).end();
});

export { router as featureFlagsRouter };
