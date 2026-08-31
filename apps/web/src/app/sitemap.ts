import type { MetadataRoute } from 'next';
import { REGION_META, regionUrl } from '@/lib/regions';
import { API_BASE } from '@/lib/api';

const STATIC_ROUTES = ['', '/products', '/deals', '/vendors', '/regions', '/blog'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  
  // Fetch blog posts for dynamic sitemap entries
  let blogPosts: { slug: string; updatedAt: string }[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog?limit=1000`);
    if (res.ok) {
      const data = await res.json();
      blogPosts = data.posts || [];
    }
  } catch (e) {
    console.error('Failed to fetch blog posts for sitemap', e);
  }

  const staticEntries = REGION_META.flatMap(region =>
    STATIC_ROUTES.map(route => ({
      url: regionUrl(region.key, route),
      lastModified: now,
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1 : 0.7,
    }))
  );

  const dynamicEntries = REGION_META.flatMap(region =>
    blogPosts.map(post => ({
      url: regionUrl(region.key, `/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt || now),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...dynamicEntries];
}
