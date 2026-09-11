import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./ai-gateway.js');

import { getEmbedding, isEmbeddingConfigured } from './ai-embeddings.js';

const fetchMock = vi.fn();

describe('ai-embeddings service', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_VERSION;
    delete process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports not configured without an API key', () => {
    expect(isEmbeddingConfigured()).toBe(false);
  });

  it('throws when no API key is configured', async () => {
    await expect(getEmbedding('grill')).rejects.toThrow('No OpenAI API key');
  });

  it('calls the Azure OpenAI embeddings deployment when an endpoint is set', async () => {
    process.env.OPENAI_API_KEY = 'KEY';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://openai.example.com';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { total_tokens: 5 } }),
    });

    const result = await getEmbedding('grill');

    expect(result.vector).toEqual([0.1, 0.2, 0.3]);
    expect(result.provider).toBe('azure');
    expect(result.inputTokens).toBe(5);
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toContain('/openai/deployments/text-embedding-3-small/embeddings');
    expect(init.headers['api-key']).toBe('KEY');
  });

  it('calls the OpenAI API directly when no Azure endpoint is set', async () => {
    process.env.OPENAI_API_KEY = 'KEY';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: [1, 1] }] }),
    });

    const result = await getEmbedding('grill');

    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.openai.com/v1/embeddings');
    expect(init.headers.Authorization).toBe('Bearer KEY');
    expect(JSON.parse(init.body).model).toBe('text-embedding-3-small');
    expect(result.provider).toBe('openai');
  });

  it('throws and logs when the embeddings API errors', async () => {
    process.env.OPENAI_API_KEY = 'KEY';
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });

    await expect(getEmbedding('grill')).rejects.toThrow('HTTP 429');
  });
});