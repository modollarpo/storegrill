import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { initAIModels, logAIRequest, getUsageStats } from '../services/ai-gateway.js';
import { rewriteProductContent } from '../services/ai-merchandising.js';

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

router.post('/rewrite', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
  const { prisma } = await import('../index.js');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      tags: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!product) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }

  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(product.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === 'string');
  } catch {
    tags = [];
  }

  const sourceFacts = [product.sku, product.brand?.name, product.category?.name, ...tags]
    .filter((fact): fact is string => Boolean(fact));

  const result = await rewriteProductContent(
    { title: product.name, description: product.description, sourceFacts },
    req.user!.id,
  );

  if (result.modelUsed !== 'fallback') {
    await prisma.aIContent.createMany({
      data: [
        {
          entityType: 'PRODUCT',
          entityId: product.id,
          content_type: 'TITLE',
          original: product.name,
          generated: result.rewrittenTitle,
          confidence: result.confidence,
          metadata: JSON.stringify({ validated: result.validated, model: result.modelUsed }),
        },
        {
          entityType: 'PRODUCT',
          entityId: product.id,
          content_type: 'DESCRIPTION',
          original: product.description,
          generated: result.rewrittenDescription,
          confidence: result.confidence,
          metadata: JSON.stringify({ validated: result.validated, model: result.modelUsed }),
        },
      ],
    });
  }

  res.json({ result });
});

export { router as aiRouter };
