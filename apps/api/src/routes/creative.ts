import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { generateBannerImage, enhanceProductImage, generateAdCopy } from '../services/image-generation.js';
import { generateDealCopy, type DealFacts } from '../services/deal-copy.js';
import { resolveMerchantContext } from '../services/merchant-rbac.js';

const router = Router();

const GenerateImageSchema = z.object({
  prompt: z.string().min(10).max(2000),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1792x1024'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  quality: z.enum(['standard', 'hd']).default('hd'),
  purpose: z.enum(['HERO_BANNER', 'DEAL_BANNER', 'CATEGORY_BANNER', 'AD_BANNER', 'SOCIAL_MEDIA', 'PRODUCT_HERO']),
  regionKey: z.string().optional(),
});

router.get('/assets', authenticate, authorize('ADMIN', 'VENDOR'), async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('../index.js');
  const assets = await prisma.aIAsset.findMany({
    where: { type: 'IMAGE' },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  res.json({
    assets: assets.map(a => ({
      id: a.id,
      name: a.name,
      url: a.source,
      metadata: a.metadata ? JSON.parse(a.metadata) : {},
      createdBy: a.createdBy,
      createdAt: a.createdAt,
    })),
  });
});

router.post('/generate', authenticate, authorize('ADMIN', 'VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = GenerateImageSchema.parse(req.body);

  try {
    const result = await generateBannerImage({
      ...body,
      userId: req.user!.id,
    });

    const { prisma } = await import('../index.js');
    const name = `${body.purpose.toLowerCase().replace('_', ' ')} ${new Date().toISOString().slice(0, 10)}`;

    const creative = await prisma.campaignCreative.create({
      data: {
        name,
        type: 'BANNER',
        status: 'DRAFT',
        content: JSON.stringify({
          url: result.url,
          revisedPrompt: result.revisedPrompt,
          prompt: body.prompt,
          size: body.size,
          style: body.style,
          quality: body.quality,
          regionKey: body.regionKey ?? null,
        }),
      },
    });

    await prisma.aIAsset.create({
      data: {
        name,
        type: 'IMAGE',
        source: result.url,
        contentType: 'image/png',
        metadata: JSON.stringify({
          creativeId: creative.id,
          purpose: body.purpose,
          size: body.size,
          style: body.style,
          quality: body.quality,
          revisedPrompt: result.revisedPrompt,
          prompt: body.prompt,
        }),
        createdBy: req.user!.id,
      },
    });

    res.json({
      image: {
        url: result.url,
        revisedPrompt: result.revisedPrompt,
        modelUsed: result.modelUsed,
      },
      creativeId: creative.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    res.status(500).json({
      error: { code: 'GENERATION_FAILED', message },
    });
  }
});

router.post('/product-hero', authenticate, authorize('ADMIN', 'VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    productTitle: z.string().min(1),
    productDescription: z.string().min(1),
    style: z.enum(['lifestyle', 'studio', 'contextual']).default('lifestyle'),
  }).parse(req.body);

  try {
    const result = await enhanceProductImage(
      body.productTitle,
      body.productDescription,
      body.style,
    );

    const { prisma } = await import('../index.js');
    await prisma.aIAsset.create({
      data: {
        name: `product hero ${new Date().toISOString().slice(0, 10)}`,
        type: 'IMAGE',
        source: result.url,
        contentType: 'image/png',
        metadata: JSON.stringify({ productTitle: body.productTitle, subStyle: body.style }),
        createdBy: req.user!.id,
      },
    });

    res.json({
      image: {
        url: result.url,
        revisedPrompt: result.revisedPrompt,
        modelUsed: result.modelUsed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Product image generation failed';
    res.status(500).json({
      error: { code: 'GENERATION_FAILED', message },
    });
  }
});

router.post('/ad-copy', authenticate, authorize('ADMIN', 'VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    productTitle: z.string().min(1),
    productPrice: z.string().min(1),
    discount: z.string().optional(),
    platform: z.enum(['google', 'facebook', 'instagram']).default('google'),
  }).parse(req.body);

  try {
    const copy = await generateAdCopy(
      body.productTitle,
      body.productPrice,
      body.discount,
      body.platform,
    );

    res.json({ copy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ad copy generation failed';
    res.status(500).json({
      error: { code: 'GENERATION_FAILED', message },
    });
  }
});

router.post('/enhance-alt-text', authenticate, authorize('ADMIN', 'VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    productTitle: z.string().min(1),
    productDescription: z.string().optional(),
    imageUrl: z.string().url(),
    productId: z.string().optional(),
  }).parse(req.body);

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    return res.json({ altText: body.productTitle });
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  let url: string;
  let headers: Record<string, string>;

  if (endpoint) {
    url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: endpoint ? undefined : deploymentName,
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive alt text for an e-commerce product image. Max 125 characters. Be specific about the product, its color, and key features visible.',
        },
        {
          role: 'user',
          content: `Product: ${body.productTitle}${body.productDescription ? `\nDescription: ${body.productDescription}` : ''}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    }),
  });

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const altText = data.choices?.[0]?.message?.content?.trim() || body.productTitle;

  if (body.productId) {
    const { prisma } = await import('../index.js');
    await prisma.aIContent.create({
      data: {
        entityType: 'PRODUCT',
        entityId: body.productId,
        content_type: 'IMAGE_ALT',
        original: null,
        generated: altText,
        confidence: 0.8,
        approved: false,
        approvedBy: null,
        metadata: JSON.stringify({ requestedBy: req.user!.id }),
      },
    });
  }

  res.json({ altText });
});

router.post('/deal-copy', authenticate, authorize('ADMIN', 'VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    dealId: z.string().min(1),
    language: z.string().optional(),
  }).parse(req.body);

  const { prisma } = await import('../index.js');
  const deal = await prisma.deal.findUnique({
    where: { id: body.dealId },
    include: {
      region: true,
      vendor: { select: { storeName: true } },
      variants: { include: { product: { select: { name: true } } }, take: 5 },
    },
  });

  if (!deal) {
    return res.status(404).json({ error: { code: 'DEAL_NOT_FOUND', message: 'Deal not found' } });
  }

  if (req.user!.role !== 'ADMIN') {
    const merchant = await resolveMerchantContext(req.user!.id);
    if (!merchant || deal.vendorId !== merchant.vendorId) {
      return res.status(403).json({
        error: { code: 'MERCHANT_FORBIDDEN', message: 'Only the vendor that owns this deal can generate its creative copy' },
      });
    }
  }

  try {
    const facts = buildDealFacts(deal, body.language);
    const result = await generateDealCopy({ ...facts, userId: req.user!.id });

    await prisma.aIContent.create({
      data: {
        entityType: 'DEAL',
        entityId: deal.id,
        content_type: 'DEAL_COPY',
        original: null,
        generated: JSON.stringify(result.copy),
        confidence: 0.8,
        approved: false,
        approvedBy: null,
        metadata: JSON.stringify({
          language: facts.language,
          requestedBy: req.user!.id,
          model: result.modelId,
        }),
      },
    });

    res.json({ copy: result.copy, model: result.modelId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deal copy generation failed';
    res.status(500).json({
      error: { code: 'GENERATION_FAILED', message },
    });
  }
});

function buildDealFacts(deal: any, requestedLanguage?: string): DealFacts {
  const currencyCode = (deal.region?.defaultCurrency ?? 'USD').split(',')[0].trim();
  const valueLabel = dealLabelFor(deal.type, deal.value, currencyCode);
  const startDate = new Date(deal.startsAt).toISOString().slice(0, 10);
  const endDate = new Date(deal.endsAt).toISOString().slice(0, 10);
  return {
    name: deal.name,
    type: deal.type,
    valueLabel,
    regionName: deal.region?.name ?? 'All regions',
    currencyCode,
    windowLabel: `${startDate} → ${endDate}`,
    endsLabel: endDate,
    vendorName: deal.vendor?.storeName ?? undefined,
    productNames: (deal.variants ?? []).map((v: any) => v.product?.name).filter(Boolean) as string[],
    language: requestedLanguage ?? deal.region?.defaultLanguage ?? 'en',
  };
}

function dealLabelFor(type: string, value: number, currencyCode: string): string {
  switch (type) {
    case 'PERCENTAGE_OFF':
      return `${value}% off`;
    case 'FIXED_AMOUNT':
      return `${formatMinorUnits(value, currencyCode)} off`;
    case 'BOGO':
      return 'Buy one, get one';
    case 'BUNDLE':
      return 'Bundle discount';
    case 'FLASH_SALE':
      return `${value}% off flash sale`;
    default:
      return `${type.toLowerCase().replace('_', ' ')} offer`;
  }
}

function formatMinorUnits(minorUnits: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(minorUnits / 100);
  } catch {
    return `${currencyCode} ${(minorUnits / 100).toFixed(2)}`;
  }
}

export { router as creativeRouter };