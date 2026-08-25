import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { parse as csvParse } from 'csv-parse';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import {
  adaptCostwayRows,
  type CostwayFeedRow,
  type NormalizedProduct,
  type NormalizedVariant,
} from '../importers/costway.js';
import { fetchFeedToFile, ftpFetchToFile } from '../importers/fetcher.js';
import {
  adaptFragranceXRows,
  isFragranceXHeader,
  type FragranceXFeedRow,
} from '../importers/fragrancex.js';
import { slugify } from '../utils/slugify.js';

const CHUNK_SIZE = 200;
const APPLY_CONCURRENCY = 12;
const ACTIVE_JOB_STATUSES = ['PENDING', 'RUNNING'];
const DELISTABLE_STATUSES = ['ACTIVE', 'PENDING_REVIEW', 'OUT_OF_STOCK'];
const FLASH_SALE_TAG = 'flash-sale';
const DAILY_DEAL_SLUG = 'costway-flash-sale';

interface AdapterProfile {
  currencyCode: string;
  dealSlug: string | null;
  dealName: string | null;
  flashSaleTag: string | null;
}

const COSTWAY_PROFILE: AdapterProfile = {
  currencyCode: 'GBP',
  dealSlug: DAILY_DEAL_SLUG,
  dealName: 'Costway Flash Sale',
  flashSaleTag: FLASH_SALE_TAG,
};

const FRAGRANCEX_PROFILE: AdapterProfile = {
  currencyCode: 'USD',
  dealSlug: 'fragrancex-deals',
  dealName: 'FragranceX Deals',
  flashSaleTag: 'deal',
};

type ExistingVariant = {
  id: string;
  sku: string;
  name: string;
  basePriceMinorUnits: number;
  stock: number;
};

type ExistingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  sku: string;
  categoryId: string;
  brandId: string | null;
  images: string;
  thumbnail: string | null;
  basePriceMinorUnits: number;
  status: string;
  tags: string;
  attributes: string;
  sourceUrl: string | null;
  variants: ExistingVariant[];
};

interface PlannedAction {
  action: 'create' | 'update' | 'unchanged';
  product: NormalizedProduct;
  existing?: ExistingProduct;
}

export async function startImportJob(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Import job ${jobId} not found`);

  const activeCount = await prisma.importJob.count({
    where: { vendorId: job.vendorId, status: { in: ACTIVE_JOB_STATUSES }, id: { not: jobId } },
  });
  if (activeCount > 0) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errors: JSON.stringify([{ message: 'Another import is already running for this vendor' }]),
        completedAt: new Date(),
      },
    });
    return;
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', phase: 'FETCHING', startedAt: new Date(), errors: '[]' },
  });

  void runImport(jobId).catch(async error => {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errors: JSON.stringify([{ message: error instanceof Error ? error.message : String(error) }]),
        completedAt: new Date(),
      },
    }).catch(() => undefined);
  });
}

async function runImport(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const schedule = job.scheduleId
    ? await prisma.importSchedule.findUnique({ where: { id: job.scheduleId } })
    : null;

  let tempFile: string | null = null;

  try {
    let feedFile: string;
    if (job.type === 'CSV_UPLOAD') {
      feedFile = job.source;
      tempFile = feedFile;
    } else {
      const fetchResult = job.source.startsWith('ftp://')
        ? await ftpFetchToFile(job.source, { jobId })
        : await fetchFeedToFile(job.source, { etag: schedule?.etag ?? null, jobId });
      if (fetchResult.unchanged) {
        await completeJob(jobId, { summary: { unchanged: true, message: 'Feed not modified since last run' } });
        await touchSchedule(schedule?.id, 'UNCHANGED');
        return;
      }
      feedFile = fetchResult.filePath;
      tempFile = feedFile;
      if (schedule) {
        await prisma.importSchedule.update({
          where: { id: schedule.id },
          data: { etag: fetchResult.etag },
        });
      }
    }

    await setPhase(jobId, 'PARSING');
    const records = await parseCsvRows(feedFile, async count => {
      await prisma.importJob.update({ where: { id: jobId }, data: { processedRows: count } });
    });

    const isFragranceX = isFragranceXHeader(Object.keys(records[0] ?? {}));
    const profile = isFragranceX ? FRAGRANCEX_PROFILE : COSTWAY_PROFILE;
    const adapted = isFragranceX
      ? adaptFragranceXRows(records as unknown as FragranceXFeedRow[])
      : adaptCostwayRows(records as unknown as CostwayFeedRow[]);
    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: records.length, processedRows: records.length },
    });

    await setPhase(jobId, 'DIFFING');
    const planned = await planChanges(job.vendorId, adapted.products);

    const summary = await executePlan(
      jobId,
      job.mode,
      job.vendorId,
      planned,
      adapted.outOfStock,
      profile,
      adapted.errors.map(e => ({
        rowNumber: e.rowNumber,
        field: e.field,
        message: e.message,
      })),
    );

    await completeJob(jobId, { summary });
    await touchSchedule(schedule?.id, adapted.errors.length > 0 ? 'OK_WITH_ERRORS' : 'OK');
  } finally {
    if (tempFile) await unlink(tempFile).catch(() => undefined);
  }
}

async function parseCsvRows(
  filePath: string,
  onProgress: (count: number) => Promise<void>,
): Promise<Record<string, string>[]> {
  const parser = csvParse({ columns: true, skip_empty_lines: true, trim: true });
  const source = createReadStream(filePath).pipe(parser);
  const rows: Record<string, string>[] = [];
  for await (const record of source) {
    rows.push(record as Record<string, string>);
    if (rows.length % 5000 === 0) await onProgress(rows.length);
  }
  return rows;
}

async function planChanges(vendorId: string, products: NormalizedProduct[]): Promise<PlannedAction[]> {
  const existingRows = await prisma.product.findMany({
    where: { vendorId },
    include: { variants: true },
  });
  const existingBySku = new Map<string, ExistingProduct>();
  for (const row of existingRows) {
    existingBySku.set(row.sku, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      shortDescription: row.shortDescription,
      sku: row.sku,
      categoryId: row.categoryId,
      brandId: row.brandId,
      images: row.images,
      thumbnail: row.thumbnail,
      basePriceMinorUnits: row.basePriceMinorUnits,
      status: row.status,
      tags: row.tags,
      attributes: row.attributes,
      sourceUrl: row.sourceUrl,
      variants: row.variants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        basePriceMinorUnits: v.basePriceMinorUnits,
        stock: v.stock,
      })),
    });
  }

  const categories = await prisma.category.findMany();
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const categoryPathOf = (categoryId: string): string => {
    const chain: string[] = [];
    let current = categoryById.get(categoryId);
    while (current) {
      chain.unshift(current.name);
      current = current.parentId ? categoryById.get(current.parentId) : undefined;
    }
    return chain.map(s => s.trim()).join('>');
  };

  const planned: PlannedAction[] = [];
  for (const product of products) {
    const existing = existingBySku.get(product.variants[0].sku);
    if (!existing) {
      planned.push({ action: 'create', product });
      continue;
    }
    if (signatureOf(product, existing, categoryPathOf)) {
      planned.push({ action: 'unchanged', product, existing });
    } else {
      planned.push({ action: 'update', product, existing });
    }
  }
  return planned;
}

function signatureOf(product: NormalizedProduct, existing: ExistingProduct, categoryPathOf: (id: string) => string): boolean {
  const desired = JSON.stringify({
    name: product.baseName,
    description: product.description,
    variants: product.variants.map(v => [v.sku, v.variantSuffix, v.priceMinorUnits, v.stock]).sort(),
    images: product.variants[0]?.images ?? [],
    tags: [...product.tags].sort(),
    attributes: product.attributes.preorder ? { preorder: true } : {},
    sourceUrl: product.sourceUrl,
    categoryPath: product.categoryPath.map(s => s.trim()).join('>'),
  });
  const actual = JSON.stringify({
    name: existing.name,
    description: existing.description,
    variants: existing.variants
      .map(v => [
        v.sku,
        suffixFromName(existing.name, v.name),
        v.basePriceMinorUnits,
        v.stock,
      ])
      .sort(),
    images: safeJson<string[]>(existing.images),
    tags: safeJson<string[]>(existing.tags),
    attributes: attributesToMap(safeJson<Array<{ name: string; value: string }>>(existing.attributes)),
    sourceUrl: existing.sourceUrl,
    categoryPath: categoryPathOf(existing.categoryId),
  });
  return desired === actual;
}

function suffixFromName(baseName: string, variantName: string): string | null {
  return variantName.startsWith(`${baseName}-`) ? variantName.slice(baseName.length + 1) : null;
}

function safeJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return [] as unknown as T;
  }
}

function attributesToMap(attributes: Array<{ name: string; value: string }>): Record<string, string> {
  return Object.fromEntries(
    attributes.filter(a => a.name.toLowerCase() !== 'specification').map(a => [a.name.toLowerCase(), a.value]),
  );
}

async function executePlan(
  jobId: string,
  mode: string,
  vendorId: string,
  planned: PlannedAction[],
  outOfStockProducts: NormalizedProduct[],
  profile: AdapterProfile,
  rowErrors: Array<{ rowNumber: number; field: string; message: string }>,
): Promise<Record<string, unknown>> {
  const dryRun = mode === 'DRY_RUN';

  const counts: Record<string, number> = { creates: 0, updates: 0, unchanged: 0, archived: 0, errors: 0, flashSaleDeals: 0, oosSynced: 0 };
  const archiveIds: string[] = [];
  const feedSkus = new Set(planned.flatMap(p => p.product.variants.map(v => v.sku)));
  for (const oos of outOfStockProducts) {
    for (const v of oos.variants) feedSkus.add(v.sku);
  }
  const candidates = await prisma.product.findMany({
    where: { vendorId, status: { in: DELISTABLE_STATUSES } },
    include: { variants: true },
  });
  for (const candidate of candidates) {
    if (candidate.variants.every(v => !feedSkus.has(v.sku))) archiveIds.push(candidate.id);
  }
  if (dryRun) counts.archived = archiveIds.length;

  const categoryCache = new Map<string, string>();
  const brandCache = new Map<string, string>();
  const pendingResults: Array<{ productId: string | null; rowNumber: number; status: string; message?: string }> = [];

  for (let i = 0; i < planned.length; i += CHUNK_SIZE) {
    const chunk = planned.slice(i, i + CHUNK_SIZE);
    if (dryRun) {
      for (const item of chunk) {
        counts[item.action === 'unchanged' ? 'unchanged' : item.action === 'create' ? 'creates' : 'updates']++;
        pendingResults.push({
          productId: item.existing?.id ?? null,
          rowNumber: pendingResults.length + 1,
          status: `planned-${item.action}`,
        });
      }
    } else {
      for (let j = 0; j < chunk.length; j += APPLY_CONCURRENCY) {
        const batch = chunk.slice(j, j + APPLY_CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (item) => {
            try {
              const result = await applyOne(vendorId, item, { categoryCache, brandCache, profile });
              return { ok: true as const, item, result };
            } catch (error) {
              return { ok: false as const, item, error };
            }
          }),
        );
        for (const r of results) {
          if (r.ok) {
            counts[r.result.action === 'create' ? 'creates' : r.result.action === 'update' ? 'updates' : 'unchanged']++;
            if (r.result.action !== 'unchanged') {
              pendingResults.push({ productId: r.result.productId, rowNumber: pendingResults.length + 1, status: r.result.action });
            }
            if (r.result.removedVariantIds.length > 0) {
              await prisma.productVariant.deleteMany({ where: { id: { in: r.result.removedVariantIds } } });
            }
          } else {
            counts.errors++;
            pendingResults.push({
              productId: r.item.existing?.id ?? null,
              rowNumber: pendingResults.length + 1,
              status: 'error',
              message: r.error instanceof Error ? r.error.message : String(r.error),
            });
          }
        }
      }
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: { phase: 'APPLYING', processedRows: Math.min(i + CHUNK_SIZE, planned.length) },
    });
  }

  if (!dryRun && outOfStockProducts.length > 0) {
    const oosSkus = new Set(outOfStockProducts.map(p => p.variants[0].sku));
    const existingOos = await prisma.product.findMany({
      where: { vendorId, sku: { in: [...oosSkus] } },
      select: { id: true, sku: true },
    });
    const existingBySku = new Map(existingOos.map(p => [p.sku, p.id]));
    for (const product of outOfStockProducts) {
      const productId = existingBySku.get(product.variants[0].sku);
      if (!productId) continue;
      await prisma.product.update({ where: { id: productId }, data: { status: 'OUT_OF_STOCK' } });
      for (const variant of product.variants) {
        const variantData = {
          productId,
          name: variant.variantSuffix ? `${product.baseName}-${variant.variantSuffix}` : product.baseName,
          sku: variant.sku,
          basePriceMinorUnits: variant.priceMinorUnits,
          currencyCode: profile.currencyCode,
          images: JSON.stringify(variant.images),
          stock: variant.stock,
          weightGrams: null,
          attributes: JSON.stringify([{ name: 'Supplier stock', value: String(variant.supplierStock) }]),
        };
        await prisma.productVariant.upsert({ where: { sku: variant.sku }, update: variantData, create: variantData });
      }
      counts.oosSynced++;
    }
  }

  if (!dryRun && archiveIds.length > 0) {
    const updated = await prisma.product.updateMany({
      where: { id: { in: archiveIds }, vendorId },
      data: { status: 'ARCHIVED' },
    });
    counts.archived += updated.count;
  }

  if (dryRun) {
    const flashSaleTag = profile.flashSaleTag;
    counts.flashSaleDeals = flashSaleTag
      ? planned.filter(p => p.product.tags.includes(flashSaleTag)).length
      : 0;
  } else if (profile.dealSlug) {
    counts.flashSaleDeals = await syncFlashSaleDeals(vendorId, profile);
  }

  for (const err of rowErrors) {
    counts.errors++;
    if (pendingResults.length < 20000) {
      pendingResults.push({ productId: null, rowNumber: err.rowNumber, status: 'row-error', message: `${err.field}: ${err.message}` });
    }
  }

  if (pendingResults.length > 0) {
    await prisma.importJobResult.createMany({
      data: pendingResults.slice(0, 20000).map(r => ({
        jobId,
        productId: r.productId,
        rowNumber: r.rowNumber,
        status: r.status,
        message: r.message,
      })),
    });
  }

  return { dryRun, ...counts };
}

async function syncFlashSaleDeals(vendorId: string, profile: AdapterProfile): Promise<number> {
  const products = await prisma.product.findMany({
    where: { vendorId, status: 'ACTIVE', tags: { contains: `"${profile.flashSaleTag}"` } },
    select: { id: true },
  });
  const productIds = products.map(p => p.id);

  const startsAt = new Date(Date.now() - 3600 * 1000);
  const endsAt = new Date(Date.now() + 48 * 3600 * 1000);
  const dealName = profile.dealName ?? 'Flash Sale';
  const deal = await prisma.deal.upsert({
    where: { slug: profile.dealSlug! },
    update: { enabled: true, startsAt, endsAt, vendorId },
    create: {
      name: dealName,
      slug: profile.dealSlug!,
      description: 'Flash-sale picks refreshed with every feed import.',
      type: 'FLASH_SALE',
      value: 0,
      enabled: true,
      startsAt,
      endsAt,
      vendorId,
    },
  });

  if (productIds.length === 0) {
    await prisma.dealVariant.deleteMany({ where: { dealId: deal.id } });
    return 0;
  }

  await prisma.dealVariant.deleteMany({ where: { dealId: deal.id, productId: { notIn: productIds } } });
  const linked = await prisma.dealVariant.findMany({ where: { dealId: deal.id }, select: { productId: true } });
  const linkedIds = new Set(linked.map(l => l.productId));
  const missing = productIds.filter(id => !linkedIds.has(id));
  if (missing.length > 0) {
    await prisma.dealVariant.createMany({ data: missing.map(productId => ({ dealId: deal.id, productId })) });
  }
  return productIds.length;
}

interface ApplyContext {
  categoryCache: Map<string, string>;
  brandCache: Map<string, string>;
  profile: AdapterProfile;
}

async function applyOne(
  vendorId: string,
  item: PlannedAction,
  ctx: ApplyContext,
): Promise<{ action: 'create' | 'update' | 'unchanged'; productId: string; removedVariantIds: string[] }> {
  const { product } = item;

  if (item.action === 'unchanged' && item.existing) {
    await syncStockOnly(item.existing, product);
    return { action: 'unchanged', productId: item.existing.id, removedVariantIds: [] };
  }

  const categoryId = await ensureCategoryPath(product.categoryPath, ctx.categoryCache);
  const brandId = await ensureBrand(ctx, product.brandName);
  const primarySku = product.variants[0].sku;
  const displayPrice = Math.min(...product.variants.map(v => v.priceMinorUnits));
  const images = product.variants[0]?.images ?? [];
  const attributesJson = JSON.stringify([
    { name: 'Specification', value: product.specification ?? '' },
    ...(product.attributes.preorder ? [{ name: 'Pre-order', value: 'true' }] : []),
    ...Object.entries(product.attributes)
      .filter(([key, value]) => key !== 'preorder' && value !== '')
      .map(([key, value]) => ({ name: key, value: String(value) })),
  ].filter(a => a.value !== ''));

  const productData = {
    vendorId,
    name: product.baseName,
    slug: `${slugify(product.baseName)}-${primarySku.toLowerCase()}`,
    description: product.description,
    shortDescription: product.description.slice(0, 300),
    sku: primarySku,
    categoryId,
    brandId,
    images: JSON.stringify(images),
    thumbnail: images[0] ?? null,
    basePriceMinorUnits: displayPrice,
    currencyCode: ctx.profile.currencyCode,
    status: statusOf(product.variants),
    tags: JSON.stringify([...product.tags].sort()),
    attributes: attributesJson,
    sourceUrl: product.sourceUrl,
  };

  let productId: string;
  let removedVariantIds: string[] = [];

  if (item.action === 'create') {
    const created = await prisma.product.create({ data: productData });
    productId = created.id;
  } else {
    const existing = item.existing!;
    await prisma.product.update({ where: { id: existing.id }, data: productData });
    productId = existing.id;
    removedVariantIds = existing.variants
      .filter(v => !product.variants.some(nv => nv.sku === v.sku))
      .map(v => v.id);
  }

  for (const variant of product.variants) {
    const isFlashSale = ctx.profile.flashSaleTag != null && product.tags.includes(ctx.profile.flashSaleTag);
    const variantAttributes = [{ name: 'Supplier stock', value: String(variant.supplierStock) }];
    if (isFlashSale && variant.listPriceMinorUnits != null) {
      variantAttributes.push({
        name: 'List price',
        value: String(variant.listPriceMinorUnits),
      });
    }
    const variantData = {
      productId,
      name: variant.variantSuffix ? `${product.baseName}-${variant.variantSuffix}` : product.baseName,
      sku: variant.sku,
      basePriceMinorUnits: variant.priceMinorUnits,
      currencyCode: ctx.profile.currencyCode,
      images: JSON.stringify(variant.images),
      stock: variant.stock,
      weightGrams: null,
      attributes: JSON.stringify(variantAttributes),
    };
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: variantData,
      create: variantData,
    });
  }

  return { action: item.action === 'create' ? 'create' : 'update', productId, removedVariantIds };
}

function statusOf(variants: NormalizedVariant[]): 'ACTIVE' | 'OUT_OF_STOCK' {
  return variants.some(v => v.stock > 0) ? 'ACTIVE' : 'OUT_OF_STOCK';
}

async function syncStockOnly(existing: ExistingProduct, product: NormalizedProduct): Promise<void> {
  for (const variant of product.variants) {
    const current = existing.variants.find(v => v.sku === variant.sku);
    if (current && current.stock !== variant.stock) {
      await prisma.productVariant.update({ where: { id: current.id }, data: { stock: variant.stock } });
    }
  }
  const desiredStatus = statusOf(product.variants);
  if (existing.status !== desiredStatus) {
    await prisma.product.update({ where: { id: existing.id }, data: { status: desiredStatus } });
    existing.status = desiredStatus;
  }
}

async function ensureCategoryPath(segments: string[], cache: Map<string, string>): Promise<string> {
  const effective = segments.map(s => s.trim()).filter(Boolean);
  let parentId: string | null = null;
  for (const segment of effective.length > 0 ? effective : ['Uncategorised']) {
    const baseSlug = slugify(segment);
    const cacheKey = `${parentId ?? 'root'}::${baseSlug}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      parentId = cached;
      continue;
    }
    let category = await prisma.category.findFirst({ where: { slug: baseSlug } });
    let slug = baseSlug;
    if (category && category.parentId !== parentId) {
      let suffix = 2;
      while (await prisma.category.findUnique({ where: { slug: `${baseSlug}-${suffix}` } })) {
        suffix++;
      }
      slug = `${baseSlug}-${suffix}`;
      category = null;
    }
    if (!category) {
      try {
        category = await prisma.category.create({
          data: { name: segment, slug, parentId },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          category = await prisma.category.findUniqueOrThrow({ where: { slug } });
        } else {
          throw error;
        }
      }
    }
    cache.set(cacheKey, category.id);
    parentId = category.id;
  }
  if (!parentId) throw new Error('Failed to resolve category path');
  return parentId;
}

async function ensureBrand(ctx: ApplyContext, rawName: string): Promise<string | null> {
  const name = rawName?.trim() || 'Unbranded';
  const cached = ctx.brandCache.get(name);
  if (cached) return cached;
  const slug = slugify(name);
  let brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) {
    try {
      brand = await prisma.brand.create({ data: { name, slug } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        brand = await prisma.brand.findUniqueOrThrow({ where: { slug } });
      } else {
        throw error;
      }
    }
  }
  ctx.brandCache.set(name, brand.id);
  return brand.id;
}

async function completeJob(jobId: string, payload: { summary: Record<string, unknown> }): Promise<void> {
  const summary = payload.summary as Record<string, number | boolean | string>;
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      phase: 'DONE',
      successRows: Number(summary.creates ?? 0) + Number(summary.updates ?? 0),
      errorRows: Number(summary.errors ?? 0),
      completedAt: new Date(),
      errors: JSON.stringify([summary]),
    },
  });
}

async function setPhase(jobId: string, phase: string): Promise<void> {
  await prisma.importJob.update({ where: { id: jobId }, data: { phase } });
}

async function touchSchedule(scheduleId: string | undefined, status: string): Promise<void> {
  if (!scheduleId) return;
  await prisma.importSchedule.update({
    where: { id: scheduleId },
    data: { lastRunAt: new Date(), lastStatus: status },
  });
}
