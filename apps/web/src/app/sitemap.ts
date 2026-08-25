import type { MetadataRoute } from 'next';
import { REGION_META, regionUrl } from '@/lib/regions';

const STATIC_ROUTES = ['', '/products', '/deals', '/vendors', '/regions'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return REGION_META.flatMap(region =>
    STATIC_ROUTES.map(route => ({
      url: regionUrl(region.key, route),
      lastModified: now,
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1 : 0.7,
    }))
  );
}
