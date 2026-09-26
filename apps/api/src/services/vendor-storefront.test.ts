import { describe, it, expect, vi } from 'vitest';
import { getVendorStorefront } from './vendor-storefront.js';

const dealState = vi.hoisted(() => ({ active: [] as unknown[] }));

vi.mock('./deal-eval.js', () => ({
  loadActiveDeals: vi.fn(async () => dealState.active),
}));

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  images: string;
  categoryId: string;
  vendorId: string;
  status: string;
  basePriceMinorUnits: number;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  totalSales: number;
  regionPrices: Array<{ regionKey: string; priceMinorUnits: number; currencyCode: string }>;
  variants: Array<{ attributes: string; stock: number }>;
};

type VendorRow = {
  id: string;
  storeName: string;
  slug: string;
  rating: number;
  products: ProductRow[];
};

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'p1',
    name: 'Cast Iron Pan',
    slug: 'cast-iron-pan',
    thumbnail: 'pan.jpg',
    images: '["pan-large.jpg"]',
    categoryId: 'cat-kitchen',
    vendorId: 'v1',
    status: 'ACTIVE',
    basePriceMinorUnits: 4999,
    currencyCode: 'GBP',
    rating: 4.5,
    reviewCount: 12,
    totalSales: 30,
    regionPrices: [],
    variants: [{ attributes: '[]', stock: 7 }],
    ...overrides,
  };
}

function mockPrisma(vendor: VendorRow | null) {
  return {
    vendorProfile: { findUnique: vi.fn(async () => vendor) },
  } as any;
}

const vendorRow: VendorRow = {
  id: 'v1',
  storeName: 'Costway',
  slug: 'costway',
  rating: 4.6,
  products: [product()],
};

async function withDeals<T>(deals: unknown[], run: () => Promise<T>): Promise<T> {
  dealState.active = deals;
  try {
    return await run();
  } finally {
    dealState.active = [];
  }
}

describe('getVendorStorefront', () => {
  it('returns null for an unknown slug', async () => {
    expect(await getVendorStorefront(mockPrisma(null), 'missing', 'UK')).toBeNull();
  });

  it('emits a resolved price, not just basePriceMinorUnits', async () => {
    const result = await getVendorStorefront(mockPrisma(vendorRow), 'costway', 'UK');
    expect(result).not.toBeNull();
    const p = result!.products[0];
    expect(p.price).toBe(4999);
    expect(p.listPriceMinorUnits).toBe(4999);
    expect(p.originalPriceMinorUnits).toBe(4999);
    expect(p.currencyCode).toBe('GBP');
    expect(Number.isFinite(p.price)).toBe(true);
  });

  it('prefers the region-scoped price and its currency', async () => {
    const row: VendorRow = {
      ...vendorRow,
      products: [product({ regionPrices: [{ regionKey: 'US', priceMinorUnits: 5999, currencyCode: 'USD' }] })],
    };
    const result = await getVendorStorefront(mockPrisma(row), 'costway', 'US');
    expect(result!.products[0].price).toBe(5999);
    expect(result!.products[0].currencyCode).toBe('USD');
  });

  it('applies an active flash deal and reports the discount', async () => {
    const deal = {
      id: 'd1',
      type: 'FLASH_SALE',
      value: 25,
      vendorId: 'v1',
      categoryIds: [],
      metadata: { flashProductIds: ['p1'] },
      variants: [],
    };
    const result = await withDeals([deal], () => getVendorStorefront(mockPrisma(vendorRow), 'costway', 'UK'));
    const p = result!.products[0];
    expect(p.price).toBe(3749);
    expect(p.listPriceMinorUnits).toBe(4999);
    expect(p.discountPercent).toBe(25);
    expect(p.dealId).toBe('d1');
  });

  it('exposes the compare-at price as the list price when no deal matches', async () => {
    const row: VendorRow = {
      ...vendorRow,
      products: [product({ variants: [{ attributes: JSON.stringify([{ name: 'compare at price', value: '7999' }]), stock: 3 }] })],
    };
    const result = await getVendorStorefront(mockPrisma(row), 'costway', 'UK');
    const p = result!.products[0];
    expect(p.price).toBe(4999);
    expect(p.listPriceMinorUnits).toBe(7999);
    expect(p.discountPercent).toBe(38);
  });

  it('sums variant stock into inventoryCount and parses the images JSON', async () => {
    const row: VendorRow = {
      ...vendorRow,
      products: [product({ variants: [{ attributes: '[]', stock: 2 }, { attributes: '[]', stock: 5 }] })],
    };
    const result = await getVendorStorefront(mockPrisma(row), 'costway', 'UK');
    expect(result!.products[0].inventoryCount).toBe(7);
    expect(result!.products[0].images).toEqual(['pan-large.jpg']);
  });

  it('never emits a non-finite price for a zero-priced product', async () => {
    const row: VendorRow = { ...vendorRow, products: [product({ basePriceMinorUnits: 0, currencyCode: 'JPY' })] };
    const result = await getVendorStorefront(mockPrisma(row), 'costway', 'JP');
    expect(Number.isFinite(result!.products[0].price)).toBe(true);
    expect(result!.products[0].price).toBe(0);
  });
});
