import { Router, Response, Request } from 'express';
import { prisma } from '../index.js';

const router = Router();

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  featured?: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    price: number;
    currencyCode: string;
  }>;
  children: CategoryNode[];
};

function buildTree(rows: Array<Record<string, any>>): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const row of rows) {
    byId.set(row.id, { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId, sortOrder: row.sortOrder ?? 0, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function pruneEmpty(nodes: CategoryNode[], activeCountById: Map<string, number>): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const node of nodes) {
    const children = pruneEmpty(node.children, activeCountById);
    const hasProducts = (activeCountById.get(node.id) ?? 0) > 0;
    if (hasProducts || children.length > 0) {
      node.children = children;
      out.push(node);
    }
  }
  return out;
}

function subtreeIds(node: CategoryNode, acc: string[] = []): string[] {
  acc.push(node.id);
  for (const child of node.children) subtreeIds(child, acc);
  return acc;
}

router.get('/', async (req: Request, res: Response) => {
  const featuredOnly = req.query.featured === 'true';
  const includeProducts = req.query.includeProducts === 'true';
  const regionKey = (req.query.regionKey as string) || 'UK';

  const rows = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  const activeCountById = new Map(
    (
      await prisma.product.groupBy({
        by: ['categoryId'],
        where: { status: 'ACTIVE' },
        _count: true,
      })
    ).map(r => [r.categoryId, r._count])
  );
  const roots = pruneEmpty(buildTree(rows), activeCountById);

  if (includeProducts) {
    for (const root of roots) {
      const ids = subtreeIds(root);
      const products = await prisma.product.findMany({
        where: { categoryId: { in: ids }, status: 'ACTIVE' },
        orderBy: { totalSales: 'desc' },
        take: 4,
        include: { regionPrices: { where: { regionKey }, take: 1 } },
      });
      root.featured = products.map((p: any) => {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        return {
          id: p.id,
          name: p.name,
          thumbnail: Array.isArray(images) ? images[0] : undefined,
          price: p.regionPrices[0] ? Number(p.regionPrices[0].priceMinorUnits) : Number(p.basePriceMinorUnits),
          currencyCode: p.regionPrices[0]?.currencyCode || p.currencyCode,
        };
      });
    }
  }

  const categories = featuredOnly ? roots.slice(0, 12) : roots;
  res.json({ categories });
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
