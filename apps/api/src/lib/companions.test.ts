import { describe, it, expect } from 'vitest';
import { scoreSimilarity } from './companions.js';

const BASE = {
  categoryId: 'cat-outerwear',
  brandId: 'brand-north',
  tags: '["waterproof","winter","unisex"]',
  attributes: '[{"name":"material","value":"polyester"},{"name":"warmth","value":"high"}]',
};

describe('scoreSimilarity', () => {
  it('scores same-category candidates higher than sibling-category ones', () => {
    const same = scoreSimilarity({ categoryId: 'cat-outerwear', tags: '[]', attributes: '[]' } as any, { categoryId: 'cat-outerwear', tags: '[]', attributes: '[]' } as any);
    const sibling = scoreSimilarity({ categoryId: 'cat-outerwear', tags: '[]', attributes: '[]' } as any, { categoryId: 'cat-other', tags: '[]', attributes: '[]' } as any);
    expect(same).toBeGreaterThan(sibling);
    expect(same).toBe(2);
    expect(sibling).toBe(1);
  });

  it('rewards shared tags via Jaccard similarity', () => {
    const shared = scoreSimilarity({ ...BASE } as any, { ...BASE, tags: '["waterproof","winter","unisex","other"]' } as any);
    const none = scoreSimilarity({ ...BASE } as any, { ...BASE, tags: '["completely","different"]' } as any);
    expect(shared).toBeGreaterThan(none);
  });

  it('rewards shared attribute name/value pairs', () => {
    const shared = scoreSimilarity({ ...BASE } as any, { ...BASE, attributes: '[{"name":"material","value":"polyester"}]' } as any);
    const none = scoreSimilarity({ ...BASE } as any, { ...BASE, attributes: '[{"name":"material","value":"denim"}]' } as any);
    expect(shared).toBeGreaterThan(none);
  });

  it('rewards same brand with a small boost', () => {
    const same = scoreSimilarity({ ...BASE, tags: '[]', attributes: '[]' } as any, { ...BASE, categoryId: 'cat-outerwear', tags: '[]', attributes: '[]' } as any);
    const other = scoreSimilarity({ ...BASE, tags: '[]', attributes: '[]' } as any, { ...BASE, categoryId: 'cat-outerwear', brandId: 'brand-other', tags: '[]', attributes: '[]' } as any);
    expect(same).toBeGreaterThan(other);
    expect(same).toBe(2.3);
    expect(other).toBe(2);
  });

  it('handles empty/no data gracefully', () => {
    expect(scoreSimilarity({ categoryId: 'a' } as any, { categoryId: 'a' } as any)).toBe(2);
    expect(scoreSimilarity({ categoryId: 'a' } as any, { categoryId: 'b' } as any)).toBe(1);
  });
});
