import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { resolveProductPricing } from '../utils/pricing.js';
import { loadActiveDeals } from '../services/deal-eval.js';
import { isSearchConfigured, searchProducts, reindexProducts, ensureSearchIndex } from '../services/ai-search.js';
import { enqueueReindexTask } from '../services/reindex-queue.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('search');

const router = Router();

const QUERY_SCHEMA = z.object({
  q: z.string().min(1),
  regionKey: z.string().default('UK'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  mode: z.enum(['hybrid', 'vector', 'keyword']).default('hybrid'),
});

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  regionPrices: true,
  variants: true,
} as const;

interface FacetEntry {
  id: string;
  name: string;
  count: number;
}

function buildFacets(products: Array<{ category?: { id: string; name: string } | null; brand?: { id: string; name: string } | null }>) {
  const categories = new Map<string, FacetEntry>();
  const brands = new Map<string, FacetEntry>();

  for (const p of products) {
    if (p.category) {
      const c = categories.get(p.category.id) ?? { id: p.category.id, name: p.category.name, count: 0 };
      c.count += 1;
      categories.set(p.category.id, c);
    }
    if (p.brand) {
      const b = brands.get(p.brand.id) ?? { id: p.brand.id, name: p.brand.name, count: 0 };
      b.count += 1;
      brands.set(p.brand.id, b);
    }
  }

  return {
    categories: Array.from(categories.values()),
    brands: Array.from(brands.values()),
  };
}

async function keywordSearch(regionKey: string, q: string, limit: number) {
  const synonyms = await prisma.searchSynonym.findMany({
    where: { term: q.toLowerCase() },
  });

  const searchTerms = [q, ...synonyms.flatMap((s: any) => JSON.parse(s.synonyms))];

  const where = {
    status: 'ACTIVE' as const,
    OR: searchTerms.flatMap(term => [
      { name: { contains: term, mode: 'insensitive' as const } },
      { description: { contains: term, mode: 'insensitive' as const } },
      { tags: { contains: term, mode: 'insensitive' as const } },
    ]),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      take: limit,
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

async function trigramSearch(regionKey: string, q: string, limit: number) {
  const terms = q.trim().split(/\s+/);
  const orConditions = terms.map((term: string) => ({
    OR: [
      { name: { contains: term, mode: 'insensitive' as const } },
      { tags: { contains: term, mode: 'insensitive' as const } },
    ],
  }));

  const where = {
    status: 'ACTIVE' as const,
    AND: orConditions,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      take: limit,
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

async function reply(res: Response, products: any[], total: number, regionKey: string) {
  const activeDeals = await loadActiveDeals(prisma);
  const facets = buildFacets(products);

  res.json({
    results: products.map((p: any) => {
      const pricing = resolveProductPricing(p, regionKey, activeDeals);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        priceMinorUnits: pricing.price,
        listPriceMinorUnits: pricing.listPriceMinorUnits ?? pricing.price,
        originalPriceMinorUnits: pricing.listPriceMinorUnits ?? pricing.price,
        discountPercent: pricing.discountPercent,
        currencyCode: pricing.currencyCode,
      };
    }),
    facets,
    total,
  });
}

router.get('/', async (req: Request, res: Response) => {
  const query = QUERY_SCHEMA.parse(req.query);

  let products: any[] = [];
  let total = 0;
  let usedAcs = false;
  let usedTrigram = false;
  const start = Date.now();

  if (isSearchConfigured()) {
    try {
      const result = await searchProducts({
        q: query.q,
        regionKey: query.regionKey,
        limit: query.limit,
        offset: query.offset,
        mode: query.mode,
      });
      if (result.ids.length > 0) {
        products = await prisma.product.findMany({
          where: { id: { in: result.ids } },
          include: PRODUCT_INCLUDE,
        });
      }
      total = result.total;
      usedAcs = true;
    } catch (error) {
      log.error({ err: error }, 'Azure AI Search failed, falling back to SQL');
      products = [];
      total = 0;
      usedAcs = false;
    }
  }

  if (!usedAcs) {
    const fallback = await keywordSearch(query.regionKey, query.q, query.limit);
    products = fallback.products;
    total = fallback.total;
    if (total === 0) {
      const triResult = await trigramSearch(query.regionKey, query.q, query.limit);
      products = triResult.products;
      total = triResult.total;
      usedTrigram = true;
    }
  }

  log.info({
    query: query.q,
    region: query.regionKey,
    mode: query.mode,
    backend: usedAcs ? 'azure-ai' : usedTrigram ? 'trigram' : 'keyword',
    total,
    duration: Date.now() - start,
  }, `search: "${query.q}" -> ${total} results`);

  await reply(res, products, total, query.regionKey);
});

router.post('/init', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const created = await ensureSearchIndex(prisma);
  res.json({ message: created ? 'Search index ready' : 'Azure AI Search not configured' });
});

router.post('/reindex', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const queued = await enqueueReindexTask();
  if (queued) {
    res.json({ message: 'Reindex queued' });
    return;
  }
  const result = await reindexProducts(prisma);
  res.json(result);
});

export { router as searchRouter };