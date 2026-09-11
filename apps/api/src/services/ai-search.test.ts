import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./ai-embeddings.js');
vi.mock('./ai-gateway.js');

import { getEmbedding } from './ai-embeddings.js';
import {
  isSearchConfigured,
  buildProductDocument,
  upsertProductDocument,
  deleteProductDocument,
  ensureSearchIndex,
  searchProducts,
  syncProductToIndex,
} from './ai-search.js';

const fetchMock = vi.fn();

function productFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Outdoor Grill',
    description: 'A compact charcoal grill for the garden.',
    shortDescription: 'Compact charcoal grill',
    sku: 'GRILL-1',
    thumbnail: 'https://example.com/grill.jpg',
    basePriceMinorUnits: 4500,
    currencyCode: 'GBP',
    status: 'ACTIVE',
    tags: '["grill","garden"]',
    category: { name: 'Grills', parent: { name: 'Garden' } },
    brand: { name: 'Emberly' },
    regionPrices: [{ regionKey: 'UK' }, { regionKey: 'EU' }],
    ...overrides,
  };
}

describe('ai-search service', () => {
  beforeEach(() => {
    process.env.AZURE_SEARCH_ENDPOINT = 'https://storegrill.search.windows.net';
    process.env.AZURE_SEARCH_API_KEY = 'secret';
    delete process.env.AZURE_SEARCH_INDEX_NAME;
    delete process.env.AZURE_SEARCH_EMBEDDING_DIMENSIONS;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getEmbedding).mockClear();
    vi.mocked(getEmbedding).mockResolvedValue({
      vector: [0.1, 0.2],
      provider: 'azure',
      modelId: 'text-embedding-3-small',
      latencyMs: 1,
      inputTokens: 2,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports configured only when endpoint and key are set', () => {
    expect(isSearchConfigured()).toBe(true);
    delete process.env.AZURE_SEARCH_KEY_OVERRIDE;
    process.env.AZURE_SEARCH_API_KEY = '';
    expect(isSearchConfigured()).toBe(false);
  });

  it('builds a product document with parsed fields and category path', () => {
    const doc = buildProductDocument(productFixture(), [0.5, 0.5]);
    expect(doc.id).toBe('product-p1');
    expect(doc.categoryPath).toBe('Garden / Grills');
    expect(doc.tags).toEqual(['grill', 'garden']);
    expect(doc.regionKeys).toEqual(['UK', 'EU']);
    expect(doc.embedding).toEqual([0.5, 0.5]);
    expect(doc.brand).toBe('Emberly');
  });

  it('keeps clean category path and empty region keys when absent', () => {
    const doc = buildProductDocument(
      productFixture({ category: { name: 'Grills', parent: null }, regionPrices: [], tags: 'not-json' }),
      [],
    );
    expect(doc.categoryPath).toBe('Grills');
    expect(doc.regionKeys).toEqual([]);
    expect(doc.tags).toEqual([]);
  });

  it('upserts a document with mergeOrUpload action', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await upsertProductDocument(productFixture());

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toContain('/indexes/storegrill-products-v1/docs/index');
    const body = JSON.parse(init.body);
    expect(body.value[0]['@search.action']).toBe('mergeOrUpload');
    expect(body.value[0].embedding).toEqual([0.1, 0.2]);
    expect(vi.mocked(getEmbedding)).toHaveBeenCalled();
  });

  it('deletes a document with the delete action', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await deleteProductDocument('p9');

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toContain('/docs/index');
    const body = JSON.parse(init.body);
    expect(body.value).toEqual([{ '@search.action': 'delete', id: 'product-p9' }]);
  });

  it('creates the index when it does not exist', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true });

    const created = await ensureSearchIndex();

    expect(created).toBe(true);
    const [url, init] = fetchMock.mock.calls[1] as [string, { method: string; body: string }];
    expect(init.method).toBe('PUT');
    expect(url).toContain('/indexes/storegrill-products-v1');
    const body = JSON.parse(init.body);
    expect(body.fields.some((f: any) => f.name === 'embedding' && f.vectorSearchProfile === 'vector-profile')).toBe(true);
    expect(body.vectorSearch.algorithms[0].hnswParameters.metric).toBe('cosine');
  });

  it('runs a hybrid search with vector and keyword clauses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        '@odata.count': 3,
        value: [{ productId: 'p1' }, { productId: 'p2' }],
      }),
    });

    const result = await searchProducts({ q: 'grill', regionKey: 'UK', limit: 10, mode: 'hybrid' });

    expect(result.ids).toEqual(['p1', 'p2']);
    expect(result.total).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toContain('/docs/search');
    const body = JSON.parse(init.body);
    expect(body.search).toBe('grill');
    expect(body.vectorQueries).toBeDefined();
    expect(body.vectorQueries[0].kind).toBe('vector');
    expect(body.filter).toContain("status eq 'ACTIVE'");
    expect(body.filter).not.toContain('regionKeys');
  });

  it('skips vector queries in keyword mode', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ value: [] }) });

    await searchProducts({ q: 'grill', limit: 5, mode: 'keyword' });

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body);
    expect(body.vectorQueries).toBeUndefined();
    expect(vi.mocked(getEmbedding)).not.toHaveBeenCalled();
  });

  it('syncing an active product upserts it', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const prisma = { product: { findUnique: () => Promise.resolve(productFixture()) } };
    await syncProductToIndex('p1', prisma as any);

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body);
    expect(body.value[0]['@search.action']).toBe('mergeOrUpload');
  });

  it('syncing a non-active product deletes it', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const prisma = { product: { findUnique: () => Promise.resolve(productFixture({ status: 'INACTIVE' })) } };
    await syncProductToIndex('p1', prisma as any);

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body);
    expect(body.value[0]['@search.action']).toBe('delete');
  });
});