import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const Q = String.fromCharCode(34);

type EngineModule = typeof import('./import-engine.js');

let engine: EngineModule;
let prisma: import('@prisma/client').PrismaClient;
let houseVendor: import('@prisma/client').VendorProfile;

const FEED_HEADERS =
  'SKU,item_group_id,item number,Item Name,Price,Specification,Description,Category,Stock,is it in stock,Is it flash-sale,Is it clearance,Is it best seller,Item Link,Image URL,Image2,Image3,Image4,Image5,Image6,Image7,Image8,is it pre-order';

function feedRow(overrides: Record<string, string>): string {
  const row: Record<string, string> = {
    SKU: '',
    item_group_id: '',
    'item number': '',
    'Item Name': 'Test Product',
    Price: '10.00',
    Specification: 'Spec text',
    Description: 'A test description',
    Category: 'Toys > Play Kitchens',
    Stock: '25',
    'is it in stock': '1',
    'Is it flash-sale': '0',
    'Is it clearance': '0',
    'Is it best seller': '0',
    'Item Link': 'https://www.costway.co.uk/p.html?utm_source=Dropship',
    'Image URL': 'http://www.costway.co.uk/media/img.jpg',
    Image2: '', Image3: '', Image4: '', Image5: '', Image6: '', Image7: '', Image8: '',
    'is it pre-order': '0',
    ...overrides,
  };
  return Object.values(row).map(v => Q + String(v) + Q).join(',');
}

function makeCsv(rows: string[]): string {
  return [FEED_HEADERS, ...rows].join('\n') + '\n';
}

const initialCsv = makeCsv([
  feedRow({ SKU: 'CW-TST-A', 'Item Name': 'Kids Kitchen Set', Price: '24.50' }),
  feedRow({ SKU: 'CW-TST-B1', item_group_id: 'CW-TST-B1CW-TST-B2', 'Item Name': 'Wooden Dollhouse-Small', Price: '10.00' }),
  feedRow({ SKU: 'CW-TST-B2', item_group_id: 'CW-TST-B1CW-TST-B2', 'Item Name': 'Wooden Dollhouse-Large', Price: '20.00' }),
  feedRow({ SKU: 'CW-TST-C', 'Item Name': 'Skeleton Decor', Price: '54.95', Category: 'Decor > Halloween', 'Is it flash-sale': '1' }),
  feedRow({ SKU: 'CW-TST-E', 'Item Name': 'Low Stock Bench', Price: '40.00', Stock: '4' }),
]);

async function runJobAndWait(csvContent: string, mode: 'APPLY' | 'DRY_RUN') {
  const vendor = await prisma.vendorProfile.findFirstOrThrow({ where: { isHouseVendor: true } });
  const dir = mkdtempSync(join(tmpdir(), 'engine-test-'));
  const filePath = join(dir, 'feed.csv');
  writeFileSync(filePath, csvContent, 'utf-8');

  const job = await prisma.importJob.create({
    data: { vendorId: vendor.id, type: 'CSV_UPLOAD', source: filePath, mode, phase: 'FETCHING' },
  });

  await engine.startImportJob(job.id);

  const deadline = Date.now() + 60_000;
  let current = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  while (!['COMPLETED', 'FAILED'].includes(current.status) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 250));
    current = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  }
  expect(current.status).toBe('COMPLETED');
  return current;
}

async function houseProducts() {
  const products = await prisma.product.findMany({
    where: { vendorId: houseVendor.id, sku: { startsWith: 'CW-TST-' } },
    include: { variants: true },
  });
  return new Map(products.map((p: any) => [p.sku, p]));
}

async function cleanTestArtifacts() {
  const products = await prisma.product.findMany({
    where: { vendorId: houseVendor.id, sku: { startsWith: 'CW-TST-' } },
    select: { id: true },
  });
  if (products.length > 0) {
    const productIds = products.map((p: any) => p.id);
    await prisma.importJobResult.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.dealVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  await prisma.deal.deleteMany({ where: { slug: 'costway-flash-sale' } });
  for (const slug of ['play-kitchens', 'toys', 'halloween', 'decor']) {
    await prisma.category.deleteMany({ where: { slug, products: { none: {} }, children: { none: {} } } });
  }
  await prisma.brand.deleteMany({ where: { slug: 'costway', products: { none: {} } } });
  const jobs = await prisma.importJob.findMany({
    where: { vendorId: houseVendor.id, source: { contains: 'engine-test-' } },
    select: { id: true },
  });
  for (const job of jobs) {
    await prisma.importJobResult.deleteMany({ where: { jobId: job.id } });
    await prisma.importJob.delete({ where: { id: job.id } });
  }
}

async function ensureHouseVendor() {
  const existing = await prisma.vendorProfile.findFirst({ where: { isHouseVendor: true } });
  if (existing) return existing;
  const user = await prisma.user.upsert({
    where: { email: 'house-vendor@engine-test.local' },
    update: {},
    create: {
      email: 'house-vendor@engine-test.local',
      password: 'test-only',
      name: 'Engine Test House Vendor',
      role: 'VENDOR',
    },
  });
  return prisma.vendorProfile.create({
    data: {
      userId: user.id,
      storeName: 'Engine Test House',
      slug: 'engine-test-house',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      revenueSharePct: 0,
      warehouseRegionKey: 'UK',
      isHouseVendor: true,
      autoPublishImports: true,
      shippingMode: 'FLAT',
      shippingFlatMinorUnits: 1000,
    },
  });
}

const hasPostgresTestDb =
  (() => {
    const url = process.env.TEST_DATABASE_URL;
    return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
  })();

beforeAll(async () => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set. Point it at a scratch database (e.g. storegrill_test).');
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NODE_ENV = 'test';
  const dbModule = await import('../db/prisma.js');
  prisma = dbModule.prisma;
  engine = await import('./import-engine.js');
  await prisma.$connect();
  houseVendor = await ensureHouseVendor();
});

describe.skipIf(!hasPostgresTestDb)('import engine (integration)', () => {
  it('runs the full lifecycle: create, unchanged re-run, dry-run diff', async () => {
    await cleanTestArtifacts();
    try {
      const firstRun = await runJobAndWait(initialCsv, 'APPLY');
      const firstSummary = JSON.parse(firstRun.errors)[0];
      expect(firstSummary.creates).toBe(3);
      expect(firstSummary.updates).toBe(0);
      expect(firstSummary.errors).toBe(0);
      expect(firstSummary.flashSaleDeals).toBe(1);

      let products = await houseProducts();
      const kitchenSet = products.get('CW-TST-A')!;
      expect(kitchenSet.status).toBe('ACTIVE');
      expect(kitchenSet.basePriceMinorUnits).toBe(2999);
      expect(kitchenSet.currencyCode).toBe('GBP');
      expect(kitchenSet.sourceUrl).not.toContain('utm_');
      expect(JSON.parse(kitchenSet.images)[0]).toContain('https://www.costway.co.uk');

      const dollhouse = [...products.values()].find(p => p.name === 'Wooden Dollhouse')!;
      expect(dollhouse.variants).toHaveLength(2);
      const variantPrices = dollhouse.variants.map((v: any) => v.basePriceMinorUnits).sort((a: any, b: any) => a - b);
      expect(variantPrices).toEqual([1299, 2499]);
      expect(dollhouse.basePriceMinorUnits).toBe(1299);

      const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'play-kitchens' } });
      expect(category.name).toBe('Play Kitchens');
      const parentCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'toys' } });
      expect(category.parentId).toBe(parentCategory.id);

      const brand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'costway' } });
      expect(kitchenSet.brandId).toBe(brand.id);

      const lowStock = products.get('CW-TST-E');
      expect(lowStock).toBeUndefined();

      const flashDeal = await prisma.deal.findUniqueOrThrow({ where: { slug: 'costway-flash-sale' } });
      expect(flashDeal.enabled).toBe(true);
      expect(flashDeal.type).toBe('FLASH_SALE');
      const skeleton = products.get('CW-TST-C')!;
      expect(skeleton.variants[0].basePriceMinorUnits).toBe(6599);
      expect(JSON.parse(skeleton.variants[0].attributes)).toEqual([
        { name: 'Supplier stock', value: '25' },
        { name: 'List price', value: '6599' },
        { name: 'Compare at price', value: '6599' },
      ]);
      const dealVariants = await prisma.dealVariant.findMany({ where: { dealId: flashDeal.id } });
      expect(dealVariants.map((dv: any) => dv.productId)).toEqual([skeleton.id]);

      const categoryDeals = await prisma.deal.findMany({ where: { slug: { startsWith: 'costway-cat-' } } });
      expect(categoryDeals.length).toBeGreaterThan(0);
      expect(categoryDeals.every((d: any) => d.type === 'PERCENTAGE_OFF' && Number(d.value) === 25)).toBe(true);

      const secondRun = await runJobAndWait(initialCsv, 'APPLY');
      const secondSummary = JSON.parse(secondRun.errors)[0];
      expect(secondSummary.creates).toBe(0);
      expect(secondSummary.updates).toBe(0);
      expect(secondSummary.unchanged).toBe(3);
      expect(secondSummary.flashSaleDeals).toBe(1);

      const changedCsv = makeCsv([
        feedRow({ SKU: 'CW-TST-A', 'Item Name': 'Kids Kitchen Set', Price: '29.00' }),
        feedRow({ SKU: 'CW-TST-B1', item_group_id: 'CW-TST-B1CW-TST-B2', 'Item Name': 'Wooden Dollhouse-Small', Price: '10.00' }),
        feedRow({ SKU: 'CW-TST-B2', item_group_id: 'CW-TST-B1CW-TST-B2', 'Item Name': 'Wooden Dollhouse-Large', Price: '20.00' }),
        feedRow({ SKU: 'CW-TST-D', 'Item Name': 'Garden Bench', Price: '100.00' }),
      ]);
      const dryRun = await runJobAndWait(changedCsv, 'DRY_RUN');
      const drySummary = JSON.parse(dryRun.errors)[0];
      expect(drySummary.dryRun).toBe(true);
      expect(drySummary.creates).toBe(1);
      expect(drySummary.updates).toBe(1);
      expect(drySummary.archived).toBe(1);

      products = await houseProducts();
      expect(products.get('CW-TST-A')!.basePriceMinorUnits).toBe(2999);
      expect(products.get('CW-TST-C')).toBeDefined();
      expect(products.has('CW-TST-D')).toBe(false);

      const applyRun = await runJobAndWait(changedCsv, 'APPLY');
      const applySummary = JSON.parse(applyRun.errors)[0];
      expect(applySummary.creates).toBe(1);
      expect(applySummary.updates).toBe(1);
      expect(applySummary.archived).toBe(1);
      expect(applySummary.flashSaleDeals).toBe(0);

      products = await houseProducts();
      expect(products.get('CW-TST-A')!.basePriceMinorUnits).toBe(3499);
      expect(products.get('CW-TST-D')!.basePriceMinorUnits).toBe(12099);
      expect(products.get('CW-TST-C')!.status).toBe('ARCHIVED');

      const remainingLinks = await prisma.dealVariant.findMany({ where: { dealId: flashDeal.id } });
      expect(remainingLinks).toHaveLength(0);
    } finally {
      await cleanTestArtifacts();
    }
  }, 120_000);

  afterAll(() => {
    void prisma?.$disconnect();
  });
});
