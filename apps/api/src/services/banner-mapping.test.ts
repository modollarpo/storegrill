import { describe, expect, it } from 'vitest';
import {
  bannerOrder,
  campaignCreativeToSlide,
  parseBannerContent,
  type BannerRow,
} from './banner-mapping.js';

function row(content: Record<string, unknown>, id = 'cre-1'): BannerRow {
  return { id, name: 'banner', content: JSON.stringify(content), createdAt: new Date('2026-09-15T10:00:00Z') };
}

describe('campaignCreativeToSlide', () => {
  it('maps an active banner to a cover slide for matching region', () => {
    const slide = campaignCreativeToSlide(
      row({
        blobUrl: 'https://account.blob.core.windows.net/storefront-banners/hero.png',
        url: 'https://temp.dalle-url/value',
        title: 'High-end audio',
        subtitle: 'Curated category drop',
        href: '/categories/audio',
        regionKey: 'UK',
        size: '1024x1792',
      }),
      'UK',
    );
    expect(slide).toEqual({
      title: 'High-end audio',
      subtitle: 'Curated category drop',
      image: 'https://account.blob.core.windows.net/storefront-banners/hero.png',
      href: '/categories/audio',
      imageFit: 'cover',
      creativeId: 'cre-1',
    });
  });

  it('is omitted for a different region', () => {
    const slide = campaignCreativeToSlide(
      row({ blobUrl: 'https://x/hero.png', title: 't', subtitle: 's', href: '/categories/audio', regionKey: 'US' }),
      'UK',
    );
    expect(slide).toBeNull();
  });

  it('falls back to the temp URL when blob persistence is unavailable', () => {
    const slide = campaignCreativeToSlide(
      row({ url: 'https://temp.dalle-url/value', title: 't', subtitle: 's', href: '/categories/audio' }),
      'UK',
    );
    expect(slide?.image).toBe('https://temp.dalle-url/value');
  });

  it('uses contain for square art', () => {
    const slide = campaignCreativeToSlide(
      row({ blobUrl: 'https://x/hero.png', title: 't', subtitle: 's', href: '/categories/audio', size: '1024x1024' }),
      'UK',
    );
    expect(slide?.imageFit).toBe('contain');
  });

  it('rejects rows missing copy, href, or with an external href', () => {
    expect(campaignCreativeToSlide(row({ blobUrl: 'https://x/hero.png', title: 't', href: '/categories/audio' }), 'UK')).toBeNull();
    expect(campaignCreativeToSlide(row({ blobUrl: 'https://x/hero.png', title: 't', subtitle: 's' }), 'UK')).toBeNull();
    expect(campaignCreativeToSlide(row({ blobUrl: 'https://x/hero.png', title: 't', subtitle: 's', href: 'https://evil.example' }), 'UK')).toBeNull();
  });

  it('rejects corrupt content JSON', () => {
    const slide = campaignCreativeToSlide({ id: 'cre-2', name: 'x', content: '{not json' }, 'UK');
    expect(slide).toBeNull();
  });
});

describe('bannerOrder', () => {
  it('uses content order when present and a high default otherwise', () => {
    expect(bannerOrder(row({ order: 3 }))).toBe(3);
    expect(bannerOrder(row({}))).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('parseBannerContent', () => {
  it('returns the parsed object and an empty object on garbage', () => {
    expect(parseBannerContent('{"a":1}')).toEqual({ a: 1 });
    expect(parseBannerContent('nope')).toEqual({});
  });
});