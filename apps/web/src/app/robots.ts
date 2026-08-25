import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/cart', '/checkout', '/account', '/auth'],
      },
    ],
    sitemap: 'https://Storegrill.net/sitemap.xml',
  };
}
