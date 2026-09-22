import { describe, expect, it } from 'vitest';
import { ALL_WEB_GUIDE_PATHS, CUSTOMER_GUIDES, SELLER_GUIDES, type GuideEntry } from './guides';

function assertValid(entries: GuideEntry[], prefix: string) {
  const slugs = entries.map(g => g.slug);
  const paths = entries.map(g => g.path);

  expect(new Set(slugs).size).toBe(slugs.length);
  expect(new Set(paths).size).toBe(paths.length);

  for (const guide of entries) {
    expect(guide.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(guide.title.trim().length).toBeGreaterThan(0);
    expect(guide.description.trim().length).toBeGreaterThan(0);
    expect(guide.path).toBe(`${prefix}/${guide.slug}`);
  }
}

describe('web guide registry', () => {
  it('customer guides have unique slugs and well-formed paths', () => {
    assertValid(CUSTOMER_GUIDES, '/help/guides');
    expect(CUSTOMER_GUIDES.length).toBeGreaterThan(0);
  });

  it('seller guides have unique slugs and well-formed paths', () => {
    assertValid(SELLER_GUIDES, '/sell/guides');
    expect(SELLER_GUIDES.length).toBeGreaterThan(0);
  });

  it('customer and seller slugs do not collide', () => {
    const customerSlugs = new Set(CUSTOMER_GUIDES.map(g => g.slug));
    const overlap = SELLER_GUIDES.filter(g => customerSlugs.has(g.slug));
    expect(overlap).toEqual([]);
  });

  it('exposes every guide path plus both hubs', () => {
    const expected = [
      '/help/guides',
      '/sell/guides',
      ...CUSTOMER_GUIDES.map(g => g.path),
      ...SELLER_GUIDES.map(g => g.path),
    ];
    expect(ALL_WEB_GUIDE_PATHS).toEqual(expected);
    expect(new Set(ALL_WEB_GUIDE_PATHS).size).toBe(ALL_WEB_GUIDE_PATHS.length);
  });
});
