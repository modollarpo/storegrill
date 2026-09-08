import type { PrismaClient } from '@prisma/client';

import { compareAtPriceOf } from '../utils/pricing.js';

export interface CategoryFeatured {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  price: number;
  currencyCode: string;
  listPriceMinorUnits?: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isFeatured: boolean;
  displayOrder: number;
  tagline?: string | null;
  productCount: number;
  featured?: CategoryFeatured[];
  children: CategoryNode[];
}

interface RowLike {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder?: number | null;
  isFeatured?: boolean | null;
  displayOrder?: number | null;
  tagline?: string | null;
}

const FEATURED_FALLBACK_LIMIT = 12;

function sortCurated(a: CategoryNode, b: CategoryNode): number {
  return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
}

function buildTree(rows: RowLike[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      sortOrder: row.sortOrder ?? 0,
      isFeatured: row.isFeatured ?? false,
      displayOrder: row.displayOrder ?? 0,
      tagline: row.tagline ?? null,
      productCount: 0,
      children: [],
    });
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

function subtreeCount(node: CategoryNode, activeCountById: Map<string, number>): number {
  let total = activeCountById.get(node.id) ?? 0;
  for (const child of node.children) total += subtreeCount(child, activeCountById);
  node.productCount = total;
  return total;
}

function subtreeIds(node: CategoryNode, acc: string[] = []): string[] {
  acc.push(node.id);
  for (const child of node.children) subtreeIds(child, acc);
  return acc;
}

/**
 * Build the category tree for one region, pruned to branches that actually
 * have ACTIVE products. With includeProducts, each node gains the top features
 * for its subtree with region-scoped prices, so the storefront's category
 * tiles are real products inside that category — by construction.
 */
export async function getCategoryTree(
  prisma: PrismaClient,
  opts: { regionKey: string; includeProducts?: boolean; featuredLimit?: number; orderBy?: 'name' | 'products'; featuredOnly?: boolean },
): Promise<CategoryNode[]> {
  const rows = (await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })) as RowLike[];

  const activeCountById = new Map(
    (await prisma.product.groupBy({
      by: ['categoryId'],
      where: { status: 'ACTIVE' },
      _count: true,
    })).map(r => [r.categoryId, r._count]),
  );

  const roots = pruneEmpty(buildTree(rows), activeCountById);
  for (const root of roots) subtreeCount(root, activeCountById);

  if (opts.featuredOnly) {
    const curated = roots.filter(r => r.isFeatured).sort(sortCurated);
    if (curated.length > 0) {
      roots.length = 0;
      roots.push(...curated);
    } else {
      roots.sort((a, b) => b.productCount - a.productCount);
      roots.length = Math.min(roots.length, FEATURED_FALLBACK_LIMIT);
    }
  } else if (opts.orderBy === 'products') {
    roots.sort((a, b) => b.productCount - a.productCount);
  }

  if (opts.includeProducts) {
    const limit = opts.featuredLimit ?? 4;
    for (const root of roots) {
      const ids = subtreeIds(root);
      const products = await prisma.product.findMany({
        where: { categoryId: { in: ids }, status: 'ACTIVE' },
        orderBy: { totalSales: 'desc' },
        take: limit,
        include: { regionPrices: { where: { regionKey: opts.regionKey }, take: 1 } },
      });
      root.featured = products.map((p: any) => {
        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        const price = p.regionPrices[0] ? Number(p.regionPrices[0].priceMinorUnits) : Number(p.basePriceMinorUnits);
        const currencyCode = p.regionPrices[0]?.currencyCode || p.currencyCode;
        const compareAt = compareAtPriceOf(p);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          thumbnail: Array.isArray(images) ? images[0] : undefined,
          price,
          currencyCode,
          listPriceMinorUnits: compareAt !== undefined && compareAt > price ? compareAt : undefined,
        };
      });
    }
  }

  return roots;
}

export { buildTree };