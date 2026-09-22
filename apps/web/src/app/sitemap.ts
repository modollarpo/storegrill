import type { MetadataRoute } from 'next';
import { REGION_META, regionUrl } from '@/lib/regions';
import { API_BASE } from '@/lib/api';
import { ALL_WEB_GUIDE_PATHS } from '@/lib/guides';

export const dynamic = 'force-dynamic';

const STATIC_ROUTES = ['', '/products', '/deals', '/vendors', '/regions', '/blog', ...ALL_WEB_GUIDE_PATHS];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  
  let blogPosts: { slug: string; updatedAt: string }[] = [];
  let products: { slug: string; updatedAt: string }[] = [];
  let categories: { slug: string; updatedAt: string }[] = [];

  try {
    const [blogRes, productRes, categoryRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/v1/blog?limit=1000`),
      fetch(`${API_BASE}/api/v1/products?limit=5000&fields=slug,updatedAt`),
      fetch(`${API_BASE}/api/v1/categories?limit=500`),
    ]);

    if (blogRes.status === 'fulfilled' && blogRes.value.ok) {
      const data = await blogRes.value.json();
      blogPosts = data.posts || [];
    }
    if (productRes.status === 'fulfilled' && productRes.value.ok) {
      const data = await productRes.value.json();
      products = (data.products || []).map((p: any) => ({ slug: p.slug, updatedAt: p.updatedAt || p.createdAt }));
    }
    if (categoryRes.status === 'fulfilled' && categoryRes.value.ok) {
      const data = await categoryRes.value.json();
      categories = (data.categories || []).map((c: any) => ({ slug: c.slug, updatedAt: c.updatedAt || c.createdAt }));
    }
  } catch (e) {
    console.error('Failed to fetch sitemap data', e);
  }

  const staticEntries = REGION_META.flatMap(region =>
    STATIC_ROUTES.map(route => ({
      url: regionUrl(region.key, route),
      lastModified: now,
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1 : 0.7,
    }))
  );

  const productEntries = REGION_META.flatMap(region =>
    products.map(product => ({
      url: regionUrl(region.key, `/products/${product.slug}`),
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  const categoryEntries = REGION_META.flatMap(region =>
    categories.map(category => ({
      url: regionUrl(region.key, `/categories/${category.slug}`),
      lastModified: new Date(category.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  const blogEntries = REGION_META.flatMap(region =>
    blogPosts.map(post => ({
      url: regionUrl(region.key, `/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt || now),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...productEntries, ...categoryEntries, ...blogEntries];
}
