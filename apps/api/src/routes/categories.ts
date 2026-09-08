import { Router, Response, Request } from 'express';
import { prisma } from '../index.js';
import { getCategoryTree, getRecentCategoryPage, buildTree, CategoryNode } from '../services/categories.js';

const router = Router();

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
    const offset = Number(req.query.offset) || 0;
    const limit = Number(req.query.limit) || 4;
    const { categories, hasMore } = await getRecentCategoryPage(prisma, { regionKey, offset, limit });
    res.json({ categories, hasMore });
    return;
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