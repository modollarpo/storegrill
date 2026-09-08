import { describe, it, expect } from 'vitest';
import { getCategoryTree, getRecentCategoryPage, CategoryNode } from './categories.js';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  displayOrder?: number;
  tagline?: string | null;
  createdAt?: Date;
};

type ProductRow = {
  id: string;
  categoryId: string;
  vendorId: string;
  status: string;
  name: string;
  slug: string;
  images: string;
  basePriceMinorUnits: number;
  currencyCode: string;
  createdAt: Date;
};

function mockPrisma(categories: CategoryRow[], products: ProductRow[]) {
  const groupBy = async (opts: any) => {
    const { by, where } = opts;
    const rows = products.filter(
      p =>
        p.status === 'ACTIVE' &&
        (!where?.categoryId?.in || where.categoryId.in.includes(p.categoryId)),
    );
    const counts = new Map<string, number>();
    for (const row of rows) {
      const k = by.map((field: string) => (row as any)[field] ?? '').join('|');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([k, count]) => {
      const parts = k.split('|');
      const obj: Record<string, unknown> = { _count: count };
      by.forEach((field: string, i: number) => (obj[field] = parts[i]));
      return obj;
    });
  };
  return {
    category: {
      findMany: async () => categories,
    },
    product: {
      groupBy,
      findMany: async (opts: any) => {
        let rows = products.filter(
          p => p.status === 'ACTIVE' && (opts.where?.categoryId?.in?.includes(p.categoryId) ?? false),
        );
        if (opts.orderBy?.createdAt === 'desc') {
          rows = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return rows.slice(0, opts.take).map(p => ({ ...p, regionPrices: [] }));
      },
    },
  };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describe('getRecentCategoryPage', () => {
  it('returns newest multi-vendor roots first, skipping featured and vendor-narrow roots', async () => {
    const prisma = mockPrisma(
      [
        { id: 'f1', name: 'Featured Departments', slug: 'featured', parentId: null, isFeatured: true, displayOrder: 1, createdAt: daysAgo(50) },
        { id: 'c1', name: 'Kitchen', slug: 'kitchen', parentId: null, createdAt: daysAgo(3) },
        { id: 'c2', name: 'Garden', slug: 'garden', parentId: null, createdAt: daysAgo(1) },
        { id: 'c3', name: 'BrandMart', slug: 'brandmart', parentId: null, createdAt: daysAgo(0) },
        { id: 'c1a', name: 'Pans', slug: 'pans', parentId: 'c1', createdAt: daysAgo(2) },
      ],
      [
        { id: 'p1', categoryId: 'c1a', vendorId: 'v1', status: 'ACTIVE', name: 'Pan', slug: 'pan', images: '["a.jpg"]', basePriceMinorUnits: 100, currencyCode: 'GBP', createdAt: daysAgo(2) },
        { id: 'p2', categoryId: 'c1a', vendorId: 'v2', status: 'ACTIVE', name: 'Pan2', slug: 'pan2', images: '["b.jpg"]', basePriceMinorUnits: 200, currencyCode: 'GBP', createdAt: daysAgo(1) },
        { id: 'p3', categoryId: 'c2', vendorId: 'v1', status: 'ACTIVE', name: 'Chair', slug: 'chair', images: '["c.jpg"]', basePriceMinorUnits: 300, currencyCode: 'GBP', createdAt: daysAgo(4) },
        { id: 'p7', categoryId: 'c2', vendorId: 'v2', status: 'ACTIVE', name: 'Lounger', slug: 'lounger', images: '["g.jpg"]', basePriceMinorUnits: 350, currencyCode: 'GBP', createdAt: daysAgo(1) },
        // BrandMart has two products from one vendor -> vendor-narrow, must be excluded
        { id: 'p4', categoryId: 'c3', vendorId: 'b1', status: 'ACTIVE', name: 'Mart', slug: 'mart', images: '["d.jpg"]', basePriceMinorUnits: 400, currencyCode: 'GBP', createdAt: daysAgo(0) },
        { id: 'p5', categoryId: 'c3', vendorId: 'b1', status: 'ACTIVE', name: 'Mart2', slug: 'mart2', images: '["e.jpg"]', basePriceMinorUnits: 500, currencyCode: 'GBP', createdAt: daysAgo(0) },
        { id: 'p6', categoryId: 'f1', vendorId: 'v1', status: 'ACTIVE', name: 'F1', slug: 'f1', images: '["f.jpg"]', basePriceMinorUnits: 600, currencyCode: 'GBP', createdAt: daysAgo(1) },
      ],
    ) as any;

    const first = await getRecentCategoryPage(prisma, { regionKey: 'UK', offset: 0, limit: 4 });
    expect(first.hasMore).toBe(false);
    expect(first.categories.map(c => c.slug)).toEqual(['garden', 'kitchen']);
    expect(first.categories[0].featured?.[0].name).toBe('Lounger');
  });

  it('paginates with hasMore and newest product per category', async () => {
    const prisma = mockPrisma(
      [
        { id: 'c1', name: 'A', slug: 'a', parentId: null, createdAt: daysAgo(2) },
        { id: 'c2', name: 'B', slug: 'b', parentId: null, createdAt: daysAgo(1) },
      ],
      [
        { id: 'p1', categoryId: 'c1', vendorId: 'v1', status: 'ACTIVE', name: 'A1', slug: 'a1', images: '[]', basePriceMinorUnits: 1, currencyCode: 'GBP', createdAt: daysAgo(1) },
        { id: 'p2', categoryId: 'c1', vendorId: 'v2', status: 'ACTIVE', name: 'A2', slug: 'a2', images: '[]', basePriceMinorUnits: 1, currencyCode: 'GBP', createdAt: daysAgo(0) },
        { id: 'p3', categoryId: 'c2', vendorId: 'v1', status: 'ACTIVE', name: 'B1', slug: 'b1', images: '[]', basePriceMinorUnits: 1, currencyCode: 'GBP', createdAt: daysAgo(0) },
        { id: 'p4', categoryId: 'c2', vendorId: 'v2', status: 'ACTIVE', name: 'B2', slug: 'b2', images: '[]', basePriceMinorUnits: 1, currencyCode: 'GBP', createdAt: daysAgo(0) },
      ],
    ) as any;

    const page1 = await getRecentCategoryPage(prisma, { regionKey: 'UK', offset: 0, limit: 1 });
    expect(page1.categories.map(c => c.slug)).toEqual(['b']);
    expect(page1.hasMore).toBe(true);

    const page2 = await getRecentCategoryPage(prisma, { regionKey: 'UK', offset: 1, limit: 1 });
    expect(page2.categories.map(c => c.slug)).toEqual(['a']);
    expect(page2.hasMore).toBe(false);

    const newest = page2.categories[0].featured ?? [];
    expect(newest[0].name).toBe('A2');
  });
});

describe('getCategoryTree', () => {
  it('orders featured products newest-first when includeProducts', async () => {
    const prisma = mockPrisma(
      [{ id: 'f1', name: 'Dept', slug: 'dept', parentId: null, isFeatured: true, displayOrder: 1, createdAt: daysAgo(5) }],
      [
        { id: 'p1', categoryId: 'f1', vendorId: 'v1', status: 'ACTIVE', name: 'Old', slug: 'old', images: '[]', basePriceMinorUnits: 1, currencyCode: 'GBP', createdAt: daysAgo(10) },
        { id: 'p2', categoryId: 'f1', vendorId: 'v1', status: 'ACTIVE', name: 'New', slug: 'new', images: '[]', basePriceMinorUnits: 2, currencyCode: 'GBP', createdAt: daysAgo(1) },
      ],
    ) as any;

    const [root] = await getCategoryTree(prisma, { regionKey: 'UK', includeProducts: true, featuredOnly: true });
    expect(root.slug).toBe('dept');
    expect((root.featured ?? []).map(f => f.name)).toEqual(['New', 'Old']);
  });
});