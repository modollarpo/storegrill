import { describe, it, expect } from 'vitest';
import { rewriteProductContent } from './ai-merchandising.js';

describe('ai-merchandising service', () => {
  it('rewrites and validates against source facts', () => {
    const result = rewriteProductContent({
      title: 'Wireless Headphones',
      description: 'Comfortable over-ear headphones with Bluetooth 5.0.',
      sourceFacts: ['Bluetooth 5.0', 'over-ear'],
    });

    expect(result.validated).toBe(true);
    expect(result.confidence).toBe(0.99);
  });

  it('fails validation when a source fact is missing', () => {
    const result = rewriteProductContent({
      title: 'Wireless Headphones',
      description: 'Comfortable over-ear headphones.',
      sourceFacts: ['Bluetooth 5.0'],
    });

    expect(result.validated).toBe(false);
  });
});
