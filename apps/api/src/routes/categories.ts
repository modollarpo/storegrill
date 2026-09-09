import { Router, Response, Request } from 'express';
import { prisma } from '../index.js';
import { getCategoryTree, getRecentCategoryPage, buildTree, CategoryNode } from '../services/categories.js';
import { cache, TTL } from '../lib/cache.js';

const router = Router();

const MAX_RECENT_OFFSET = 1000;

router.get('/', async (req: Request, res: Response) => {
  const featuredOnly = req.query.featured === 'true';
  const includeProducts = req.query.includeProducts === 'true';
  const regionKey = (req.query.regionKey as string) || 'UK';

  if (req.query.all === 'true') {
    const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ categories: buildTree(rows as any) });
    return;
  }

  if (req.query.sort === 'recent') {
    const offset = Math.min(Math.max(0, Number(req.query.offset) || 0), MAX_RECENT_OFFSET);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 4, 8));
    const cacheKey = `recent:${regionKey}:${offset}:${limit}`;

    const cached = cache.get<{ categories: CategoryNode[]; hasMore: boolean }>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const { categories, hasMore } = await getRecentCategoryPage(prisma, { regionKey, offset, limit });
    const payload = { categories, hasMore };
    cache.set(cacheKey, payload, TTL.categories);

    res.setHeader('X-Cache', 'MISS');
    return res.json(payload);
  }

  const roots: CategoryNode[] = await getCategoryTree(prisma, {
    regionKey,
    includeProducts,
    orderBy: 'name',
    featuredOnly,
  });

  res.json({ categories: roots });
});

router.get('/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      parent: true,
    }
  });

  if (!category) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Category not found' }
    });
  }

  // Compute brand facets for this category
  const brandCounts = await prisma.product.groupBy({
    by: ['brandId'],
    where: { categoryId: category.id, brandId: { not: null } },
    _count: true,
  });

  const brands = await prisma.brand.findMany({
    where: { id: { in: brandCounts.map(b => b.brandId as string) } }
  });

  const facets = {
    brands: brandCounts.map(bc => ({
      brand: brands.find(b => b.id === bc.brandId),
      count: bc._count,
    })).filter(b => b.brand),
  };

  res.json({ category, facets });
});

export { router as categoriesRouter };