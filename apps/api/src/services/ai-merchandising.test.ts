import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rewriteProductContent } from './ai-merchandising.js';

vi.mock('./ai-gateway.js', () => ({
  getModelConfig: vi.fn().mockResolvedValue({
    provider: 'azure',
    modelId: 'gpt-4-1-mini',
    maxTokens: 128000,
    costPer1kInput: 0.0004,
    costPer1kOutput: 0.0016,
  }),
  logAIRequest: vi.fn().mockResolvedValue('req_1'),
}));

describe('ai-merchandising service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.AI_MERCHANDISING_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_DEPLOYMENT;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rewrites and validates against source facts (fallback)', async () => {
    const result = await rewriteProductContent({
      title: 'Wireless Headphones',
      description: 'Comfortable over-ear headphones with Bluetooth 5.0.',
      sourceFacts: ['Bluetooth 5.0', 'over-ear'],
    });

    expect(result.validated).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.modelUsed).toBe('fallback');
  });

  it('fails validation when a source fact is missing', async () => {
    const result = await rewriteProductContent({
      title: 'Wireless Headphones',
      description: 'Comfortable over-ear headphones.',
      sourceFacts: ['Bluetooth 5.0'],
    });

    expect(result.validated).toBe(false);
    expect(result.confidence).toBeLessThan(0.75);
  });

  it('throws when AI_MERCHANDISING_ENABLED=false', async () => {
    process.env.AI_MERCHANDISING_ENABLED = 'false';
    await expect(
      rewriteProductContent({ title: 'T', description: 'D', sourceFacts: [] }),
    ).rejects.toThrow('AI merchandising service is disabled');
  });

  it('trims whitespace from titles and descriptions', async () => {
    const result = await rewriteProductContent({
      title: '  Wireless Headphones  ',
      description: '  Comfortable over-ear headphones with Bluetooth 5.0.  ',
      sourceFacts: ['Bluetooth 5.0'],
    });

    expect(result.rewrittenTitle).toBe('Wireless Headphones');
    expect(result.rewrittenDescription).toBe('Comfortable over-ear headphones with Bluetooth 5.0.');
  });

  it('calls the Azure OpenAI deployment when endpoint is configured', async () => {
    process.env.OPENAI_API_KEY = 'azure-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://storegrill-openai-global.openai.azure.com';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4-1-mini';
    process.env.AZURE_OPENAI_API_VERSION = '2024-06-01';
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ title: 'Rewritten', description: 'Bluetooth 5.0' }) } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
        { status: 200 },
      ),
    );

    const result = await rewriteProductContent({
      title: 'Wireless Headphones',
      description: 'Comfortable over-ear headphones with Bluetooth 5.0.',
      sourceFacts: ['Bluetooth 5.0'],
    });

    expect(result.modelUsed).toBe('azure/gpt-4-1-mini');
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toBe(
      'https://storegrill-openai-global.openai.azure.com/openai/deployments/gpt-4-1-mini/chat/completions?api-version=2024-06-01',
    );
    const headers = init?.headers as Record<string, string>;
    expect(headers['api-key']).toBe('azure-key');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBeUndefined();
  });
});
