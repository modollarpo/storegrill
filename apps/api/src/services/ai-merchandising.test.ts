import { describe, it, expect, beforeEach } from 'vitest';
import { rewriteProductContent } from './ai-merchandising.js';

describe('ai-merchandising service', () => {
  beforeEach(() => {
    process.env.AI_MERCHANDISING_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
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
});
