import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { getEmbedding } from './ai-embeddings.js';

export interface ProductSearchDocument {
  id: string;
  productId: string;
  name: string;
  brand?: string;
  description: string;
  shortDescription?: string;
  categoryPath: string;
  sku: string;
  tags: string[];
  regionKeys: string[];
  basePriceMinorUnits: number;
  currencyCode: string;
  thumbnail?: string;
  status: string;
  embedding: number[];
}

export interface SearchQueryOptions {
  q: string;
  regionKey?: string;
  limit: number;
  offset?: number;
  mode: 'hybrid' | 'vector' | 'keyword';
}

export interface SearchQueryResult {
  ids: string[];
  total: number;
}

const INDEX_NAME = process.env.AZURE_SEARCH_INDEX_NAME || 'storegrill-products-v1';
const API_VERSION = process.env.AZURE_SEARCH_API_VERSION || '2023-11-01';
const EMBEDDING_DIMENSIONS = 1536;

export function isSearchConfigured(): boolean {
  return Boolean(process.env.AZURE_SEARCH_ENDPOINT && process.env.AZURE_SEARCH_API_KEY);
}

function baseUrl(): string {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT?.replace(/\/$/, '');
  if (!endpoint) throw new Error('AZURE_SEARCH_ENDPOINT not configured');
  return `${endpoint}/indexes/${INDEX_NAME}`;
}

function searchHeaders(): Record<string, string> {
  return {
    'api-key': process.env.AZURE_SEARCH_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

export function buildProductDocument(
  product: {
    id: string;
    name: string;
    description: string;
    shortDescription?: string | null;
    sku: string;
    thumbnail?: string | null;
    basePriceMinorUnits: number;
    currencyCode: string;
    status: string;
    tags: string;
    category?: { name: string; parent?: { name: string } | null } | null;
    brand?: { name: string } | null;
    regionPrices?: Array<{ regionKey: string }>;
  },
  embedding: number[],
): ProductSearchDocument {
  const tags = parseJsonArray(product.tags);
  const regionKeys = (product.regionPrices ?? []).map(rp => rp.regionKey);
  const categoryPath = [product.category?.parent?.name, product.category?.name]
    .filter((part): part is string => Boolean(part))
    .join(' / ');

  return {
    id: `product-${product.id}`,
    productId: product.id,
    name: product.name,
    brand: product.brand?.name,
    description: product.description,
    shortDescription: product.shortDescription ?? undefined,
    categoryPath,
    sku: product.sku,
    tags,
    regionKeys,
    basePriceMinorUnits: product.basePriceMinorUnits,
    currencyCode: product.currencyCode,
    thumbnail: product.thumbnail ?? undefined,
    status: product.status,
    embedding,
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

async function uploadDocuments(docs: Array<Record<string, unknown>>, prisma: PrismaClient): Promise<void> {
  const batches = chunk(docs, 1000);
  for (const batch of batches) {
    const response = await fetch(`${baseUrl()}/docs/index?api-version=${API_VERSION}`, {
      method: 'POST',
      headers: searchHeaders(),
      body: JSON.stringify({
        value: batch.map(doc => ({ '@search.action': 'mergeOrUpload', ...doc })),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`ACS index upload failed (${response.status}): ${detail.slice(0, 200)}`);
    }
  }
}

export async function upsertProductDocument(
  product: Parameters<typeof buildProductDocument>[0],
  prisma: PrismaClient = db,
  userId?: string,
): Promise<void> {
  const embeddingResult = await getEmbedding(
    `${product.name} ${product.brand?.name ?? ''} ${product.description} ${product.sku}`.trim(),
    userId,
  );
  const doc = buildProductDocument(product, embeddingResult.vector);
  await uploadDocuments([doc as unknown as Record<string, unknown>], prisma);
}

export async function syncProductToIndex(productId: string, prisma: PrismaClient = db): Promise<void> {
  if (!isSearchConfigured()) return;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      sku: true,
      thumbnail: true,
      basePriceMinorUnits: true,
      currencyCode: true,
      status: true,
      tags: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
      brand: { select: { name: true } },
      regionPrices: { select: { regionKey: true } },
    },
  });
  if (!product || product.status !== 'ACTIVE') {
    await deleteProductDocument(productId, prisma);
    return;
  }
  await upsertProductDocument(product, prisma);
}

export async function deleteProductDocument(productId: string, prisma: PrismaClient = db): Promise<void> {
  const response = await fetch(`${baseUrl()}/docs/index?api-version=${API_VERSION}`, {
    method: 'POST',
    headers: searchHeaders(),
    body: JSON.stringify({
      value: [{ '@search.action': 'delete', id: `product-${productId}` }],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ACS index delete failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

export async function ensureSearchIndex(prisma: PrismaClient = db): Promise<boolean> {
  if (!isSearchConfigured()) return false;
  const url = `${baseUrl()}?api-version=${API_VERSION}`;
  const exists = await fetch(url, { headers: searchHeaders() });
  if (exists.ok) return true;

  const definition = {
    name: INDEX_NAME,
    fields: [
      { name: 'id', type: 'Edm.String', key: true, searchable: false, filterable: true },
      { name: 'productId', type: 'Edm.String', searchable: false, filterable: true },
      { name: 'name', type: 'Edm.String', searchable: true },
      { name: 'brand', type: 'Edm.String', searchable: true },
      { name: 'description', type: 'Edm.String', searchable: true },
      { name: 'shortDescription', type: 'Edm.String', searchable: true },
      { name: 'categoryPath', type: 'Edm.String', searchable: true, filterable: true },
      { name: 'sku', type: 'Edm.String', searchable: true },
      { name: 'tags', type: 'Collection(Edm.String)', searchable: true, filterable: true },
      { name: 'regionKeys', type: 'Collection(Edm.String)', searchable: false, filterable: true },
      { name: 'basePriceMinorUnits', type: 'Edm.Int32', filterable: true, sortable: true },
      { name: 'currencyCode', type: 'Edm.String', searchable: false, filterable: true },
      { name: 'thumbnail', type: 'Edm.String', searchable: false },
      { name: 'status', type: 'Edm.String', searchable: false, filterable: true },
      {
        name: 'embedding',
        type: 'Collection(Edm.Single)',
        searchable: true,
        dimensions: Number(process.env.AZURE_SEARCH_EMBEDDING_DIMENSIONS) || EMBEDDING_DIMENSIONS,
        vectorSearchConfiguration: 'vector-config',
      },
    ],
    vectorSearch: {
      algorithmConfigurations: [
        {
          name: 'vector-config',
          kind: 'hnsw',
          parameters: { m: 4, efConstruction: 400, efSearch: 500, metric: 'cosine' },
        },
      ],
    },
  };

  const created = await fetch(url, {
    method: 'PUT',
    headers: searchHeaders(),
    body: JSON.stringify(definition),
  });
  if (!created.ok) {
    const detail = await created.text().catch(() => '');
    throw new Error(`ACS index create failed (${created.status}): ${detail.slice(0, 300)}`);
  }
  return true;
}

export async function reindexProducts(prisma: PrismaClient = db, userId?: string): Promise<{ indexed: number; failed: number }> {
  if (!isSearchConfigured()) return { indexed: 0, failed: 0 };

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      sku: true,
      thumbnail: true,
      basePriceMinorUnits: true,
      currencyCode: true,
      status: true,
      tags: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
      brand: { select: { name: true } },
      regionPrices: { select: { regionKey: true } },
    },
  });

  let indexed = 0;
  let failed = 0;
  const batchSize = 50;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const docs: Array<Record<string, unknown>> = [];
    for (const product of batch) {
      try {
        const embeddingResult = await getEmbedding(
          `${product.name} ${product.brand?.name ?? ''} ${product.description} ${product.sku}`.trim(),
          userId,
        );
        docs.push(buildProductDocument(product, embeddingResult.vector) as unknown as Record<string, unknown>);
        indexed += 1;
      } catch {
        failed += 1;
      }
    }
    if (docs.length > 0) {
      await uploadDocuments(docs, prisma);
    }
  }
  return { indexed, failed };
}

export async function searchProducts(options: SearchQueryOptions): Promise<SearchQueryResult> {
  const query = options.q.trim();
  const filterParts = ['status eq \'ACTIVE\''];
  if (options.regionKey) {
    filterParts.push(`regionKeys/any(r: r eq '${options.regionKey}')`);
  }
  const filter = filterParts.join(' and ');

  const payload: Record<string, unknown> = {
    search: options.mode === 'vector' ? '*' : query,
    queryType: 'simple',
    searchMode: 'any',
    filter,
    top: options.limit,
    skip: options.offset ?? 0,
    count: true,
  };

  if (options.mode !== 'keyword') {
    const embeddingResult = await getEmbedding(query);
    payload.vectorQueries = [
      {
        kind: 'vector',
        vector: embeddingResult.vector,
        k: Math.max(options.limit * 2, 20),
        fields: 'embedding',
        exhaustive: false,
      },
    ];
  }

  const response = await fetch(`${baseUrl()}/docs/search?api-version=${API_VERSION}`, {
    method: 'POST',
    headers: searchHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ACS search failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = await response.json() as {
    value?: Array<{ productId?: string }>;
    '@odata.count'?: number;
  };

  return {
    ids: (data.value ?? []).map(hit => hit.productId).filter((id): id is string => Boolean(id)),
    total: data['@odata.count'] ?? (data.value ?? []).length,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}