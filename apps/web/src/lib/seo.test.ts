import { describe, expect, it } from 'vitest';
import { buildMetadata, SEO_DEFAULTS, seoCountryToken } from './seo';

describe('seoCountryToken', () => {
  it('maps special region keys to shopper-style country tokens', () => {
    expect(seoCountryToken('AE')).toBe('UAE');
    expect(seoCountryToken('US')).toBe('USA');
    expect(seoCountryToken('UK')).toBe('UK');
    expect(seoCountryToken('DE')).toBe('DE');
    expect(seoCountryToken('NG')).toBe('NG');
  });
});

describe('SEO_DEFAULTS', () => {
  it('builds region-aware category titles without repetition', () => {
    const seo = SEO_DEFAULTS.category('electronics', 'Electronics', 'UK');
    expect(seo.title).toBe('Shop Electronics in UK');
    expect(seo.title.split(' ').filter(w => w.toLowerCase().includes('electronics')).length).toBe(1);
    expect(seo.title.toLowerCase()).not.toContain('storegrill');
    expect(seo.keywords?.[0]).toBe('electronics uk');
  });

  it('uses a category description from the API when available', () => {
    const seo = SEO_DEFAULTS.category('computers', 'Computers & Accessories', 'DE', 'Laptops, desktops and accessories with fast European shipping.');
    expect(seo.description).toContain('Computers & Accessories');
    expect(seo.description).toContain('Germany');
    expect(seo.title).toBe('Shop Computers & Accessories in DE');
  });

  it('prefixes product titles with Buy and keeps them tight', () => {
    const seo = SEO_DEFAULTS.product('Sony WH-1000XM5 Wireless Noise Cancelling Headphones', '299.99', 'GBP', 4.5, 128, 'UK');
    expect(seo.title.startsWith('Buy ')).toBe(true);
    expect(seo.title).toMatch(/Buy .* \|?/);
    expect(seo.title.length <= 60).toBe(true);
    expect(seo.description).toContain('United Kingdom');
    expect(seo.description).toContain('£299.99');
    expect(seo.description).toContain('4.5/5 from 128 reviews');
    expect(seo.keywords?.[0]).toContain('sony wh-1000xm5');
  });

  it('makes home and deals titles region-aware', () => {
    expect(SEO_DEFAULTS.home('US').title).toBe('Online Shopping in USA');
    expect(SEO_DEFAULTS.home('US').description).toContain('United States');
    expect(SEO_DEFAULTS.home('NG').title).toBe('Online Shopping in NG');
    expect(SEO_DEFAULTS.deals('UK').title).toBe("Today's Deals in UK");
  });
});

describe('buildMetadata', () => {
  it('returns a brand-free page title and single-brand social titles', () => {
    const meta = buildMetadata({ title: 'Shop Electronics in UK', description: 'Buy electronics online.', path: '/categories/electronics', regionKey: 'UK' });
    expect(meta.title).toBe('Shop Electronics in UK');
    expect(meta.openGraph?.title).toBe('Shop Electronics in UK | Storegrill');
    expect(meta.twitter?.title).toBe('Shop Electronics in UK | Storegrill');
  });

  it('strips a legacy brand suffix so the layout template never doubles it', () => {
    const meta = buildMetadata({ title: 'Shop Electronics — Storegrill', description: 'Buy electronics online.', path: '/categories/electronics', regionKey: 'UK' });
    expect(meta.title).toBe('Shop Electronics');
    expect(meta.openGraph?.title).toBe('Shop Electronics | Storegrill');
  });

  it('exposes keywords and canonical/hreflang alternates', () => {
    const meta = buildMetadata({ title: 'Buy Smartwatch in UK', description: 'Buy a smartwatch.', path: '/products/smartwatch', regionKey: 'UK', keywords: ['smartwatch uk', 'buy smartwatch online'] });
    expect(meta.keywords).toEqual(['smartwatch uk', 'buy smartwatch online']);
    expect(meta.alternates?.canonical?.toLowerCase()).toContain('uk.storegrill.net');
    expect(meta.alternates?.languages?.['x-de']?.toLowerCase()).toContain('de.storegrill.net');
  });
});