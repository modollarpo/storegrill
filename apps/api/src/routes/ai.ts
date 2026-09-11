import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { initAIModels, logAIRequest, getUsageStats } from '../services/ai-gateway.js';

const router = Router();

router.get('/models', authenticate, async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const models = await prisma.aIModelConfig.findMany({
    where: { enabled: true },
    orderBy: [{ provider: 'asc' }, { modelId: 'asc' }],
  });
  res.json({ models });
});

router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    purpose: z.string().min(1),
    provider: z.string().optional(),
    modelId: z.string().optional(),
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
    latencyMs: z.number().int().min(0),
    status: z.enum(['SUCCESS', 'ERROR', 'TIMEOUT', 'RATE_LIMITED']),
    errorMessage: z.string().optional(),
    cacheHit: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const id = await logAIRequest({
    userId: req.user!.id,
    ...body,
    modelProvider: body.provider,
  }, prisma);

  res.status(201).json({ id });
});

router.get('/usage/:period', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { period } = req.params;
  const { prisma } = await import('../index.js');
  const usage = await getUsageStats(period, prisma);
  res.json({ usage: usage ?? { period, totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCostMinorUnits: 0 } });
});

router.post('/init', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  await initAIModels(prisma);
  res.json({ message: 'AI models initialized' });
});

export { router as aiRouter };
