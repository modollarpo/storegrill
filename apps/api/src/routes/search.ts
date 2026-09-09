import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { resolveProductPricing } from '../utils/pricing.js';
import { loadActiveDeals } from '../services/deal-eval.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = z.object({
    q: z.string().min(1),
    regionKey: z.string().default('UK'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }).parse(req.query);

  // Look up synonyms
  const synonyms = await prisma.searchSynonym.findMany({
    where: { term: query.q.toLowerCase() },
  });
  
  const searchTerms = [query.q, ...synonyms.flatMap((s: any) => JSON.parse(s.synonyms))];
  
  const where = {
    status: 'ACTIVE' as const,
    OR: searchTerms.flatMap(term => [
      { name: { contains: term } },
      { description: { contains: term } },
      { tags: { contains: term } },
    ])
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      take: query.limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        regionPrices: { where: { regionKey: query.regionKey }, take: 1 },
        variants: true,
      }
    }),
    prisma.product.count({ where })
  ]);

  // Build facets
  const categoryFacets = new Map<string, { id: string, name: string, count: number }>();
  const brandFacets = new Map<string, { id: string, name: string, count: number }>();

  for (const p of products) {
    if (p.category) {
      const c = categoryFacets.get(p.category.id) || { id: p.category.id, name: p.category.name, count: 0 };
      c.count++;
      categoryFacets.set(p.category.id, c);
    }
    if (p.brand) {
      const b = brandFacets.get(p.brand.id) || { id: p.brand.id, name: p.brand.name, count: 0 };
      b.count++;
      brandFacets.set(p.brand.id, b);
    }
  }

  const activeDeals = await loadActiveDeals(prisma);

  res.json({
    results: products.map((p: any) => {
      const pricing = resolveProductPricing(p, query.regionKey, activeDeals);
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
    facets: {
      categories: Array.from(categoryFacets.values()),
      brands: Array.from(brandFacets.values()),
    },
    total,
  });
});

export { router as searchRouter };
