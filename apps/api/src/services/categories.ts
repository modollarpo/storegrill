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
  createdAt?: Date | null;
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
  createdAt?: Date | null;
}

const FEATURED_FALLBACK_LIMIT = 12;
const RECENT_PAGE_LIMIT = 4;
const RECENT_PAGE_MAX = 8;

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
      createdAt: row.createdAt ?? null,
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
 * have ACTIVE products. Branches that only contain products from a single
 * vendor are excluded from the auto "recently added" feed, so vendor-branded
 * aisles never surface as homepage categories.
 */
async function buildRegionTree(prisma: PrismaClient, regionKey: string): Promise<CategoryNode[]> {
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
  return roots;
}

function featuredProduct(p: any, regionKey: string): CategoryFeatured {
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
}

/**
 * Attach each root's newest ACTIVE products (region-scoped prices) so the
 * storefront tiles are real products inside that category — automatically
 * refreshed as new products are imported, by construction.
 */
async function attachNewestProducts(prisma: PrismaClient, roots: CategoryNode[], regionKey: string, take = 4): Promise<void> {
  for (const root of roots) {
    const ids = subtreeIds(root);
    const products = await prisma.product.findMany({
      where: { categoryId: { in: ids }, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take,
      include: { regionPrices: { where: { regionKey }, take: 1 } },
    });
    root.featured = products.map(p => featuredProduct(p, regionKey));
  }
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function vendorMatchesRoot(vendor: { storeName?: string | null; slug?: string; businessLegalName?: string | null }, root: CategoryNode): boolean {
  const rootLabels = [root.name, root.slug].map(normalizeLabel).filter(Boolean);
  if (rootLabels.length === 0) return false;
  const vendorLabels = [vendor.storeName, vendor.slug, vendor.businessLegalName].map(v => (v ? normalizeLabel(v) : '')).filter(Boolean);
  for (const rl of rootLabels) {
    for (const vl of vendorLabels) {
      if (rl === vl || rl.includes(vl) || vl.includes(rl)) return true;
    }
  }
  return false;
}

/**
 * Roots eligible for the auto "recently added" feed: exclude only roots whose
 * name collides with their sole vendor (vendor-narrow aisles like a literal
 * "Costway" root). Everything else — including single-vendor real shopping
 * categories — is a legitimate homepage candidate. Derived purely from data.
 */
async function recentEligibleRoots(prisma: PrismaClient, roots: CategoryNode[]): Promise<CategoryNode[]> {
  const rows = await prisma.product.groupBy({
    by: ['categoryId', 'vendorId'],
    where: { status: 'ACTIVE' },
    _count: true,
  });
  const vendorsByCategory = new Map<string, Set<string>>();
  const allVendorIds = new Set<string>();
  for (const row of rows) {
    let vendors = vendorsByCategory.get(row.categoryId);
    if (!vendors) {
      vendors = new Set();
      vendorsByCategory.set(row.categoryId, vendors);
    }
    vendors.add(row.vendorId);
    allVendorIds.add(row.vendorId);
  }

  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: [...allVendorIds] } },
    select: { id: true, storeName: true, slug: true, businessLegalName: true },
  });
  const vendorById = new Map(
    vendors.map((v: { id: string; storeName: string; slug: string; businessLegalName: string | null }) => [v.id, v]),
  );

  const eligible: CategoryNode[] = [];
  for (const root of roots) {
    if (root.isFeatured) continue;
    const rootVendors = new Set<string>();
    for (const id of subtreeIds(root)) {
      for (const vendorId of vendorsByCategory.get(id) ?? []) rootVendors.add(vendorId);
    }
    if (rootVendors.size >= 2) {
      eligible.push(root);
      continue;
    }
    const onlyVendorId = [...rootVendors][0];
    if (onlyVendorId == null || rootVendors.size === 0) {
      eligible.push(root);
      continue;
    }
    const vendor = vendorById.get(onlyVendorId);
    if (!vendor || !vendorMatchesRoot(vendor, root)) eligible.push(root);
  }
  return eligible;
}

/**
 * Auto "recently added" feed: newest roots created after the curated featured
 * set, each carrying its newest product. Paginated with offset/limit and a
 * hasMore flag so the storefront can infinitely scroll new categories as
 * imports land.
 */
export async function getRecentCategoryPage(
  prisma: PrismaClient,
  opts: { regionKey: string; offset?: number; limit?: number },
): Promise<{ categories: CategoryNode[]; hasMore: boolean }> {
  const roots = await buildRegionTree(prisma, opts.regionKey);
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.max(1, Math.min(opts.limit ?? RECENT_PAGE_LIMIT, RECENT_PAGE_MAX));

  const candidates = (await recentEligibleRoots(prisma, roots)).sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );

  const hasMore = offset + limit < candidates.length;
  const page = candidates.slice(offset, offset + limit);
  await attachNewestProducts(prisma, page, opts.regionKey);
  return { categories: page, hasMore };
}

export async function getCategoryTree(
  prisma: PrismaClient,
  opts: { regionKey: string; includeProducts?: boolean; featuredLimit?: number; orderBy?: 'name' | 'products'; featuredOnly?: boolean },
): Promise<CategoryNode[]> {
  const roots = await buildRegionTree(prisma, opts.regionKey);

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
    await attachNewestProducts(prisma, roots, opts.regionKey, opts.featuredLimit ?? 4);
  }

  return roots;
}

export { buildTree };