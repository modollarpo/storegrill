import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import {
  createExperiment, startExperiment, pauseExperiment, completeExperiment,
  getExperimentResults, listExperiments, assignVariant, trackExperimentEvent,
} from '../services/experiments.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const status = _req.query.status as string | undefined;
  const experiments = await listExperiments(status, prisma);
  res.json({ experiments });
});

router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    trafficPct: z.number().int().min(0).max(100).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    variants: z.array(z.object({
      name: z.string().min(1),
      weight: z.number().int().min(1).optional(),
      config: z.string().optional(),
      isControl: z.boolean().optional(),
    })).min(2),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const experiment = await createExperiment({
    ...body,
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
  }, prisma);

  res.status(201).json({ experiment });
});

router.post('/:id/start', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const experiment = await startExperiment(req.params.id, prisma);
  res.json({ experiment });
});

router.post('/:id/pause', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const experiment = await pauseExperiment(req.params.id, prisma);
  res.json({ experiment });
});

router.post('/:id/complete', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const experiment = await completeExperiment(req.params.id, prisma);
  res.json({ experiment });
});

router.get('/:id/results', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const results = await getExperimentResults(req.params.id, prisma);
  if (!results) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ results });
});

router.post('/:id/assign', authenticate, async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const variantId = await assignVariant(req.params.id, req.user!.id, prisma);
  if (!variantId) { res.status(404).json({ error: 'Experiment not active' }); return; }
  res.json({ variantId });
});

router.post('/:id/track', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    variantId: z.string(),
    eventType: z.string(),
    value: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const event = await trackExperimentEvent(
    req.params.id, body.variantId, body.eventType, req.user!.id, body.value, body.metadata, prisma,
  );
  res.status(201).json({ event });
});

export { router as experimentsRouter };
