import type { MetadataRoute } from 'next';

const APEX = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'storegrill.net';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cart',
          '/checkout',
          '/checkout/',
          '/account',
          '/account/',
          '/auth',
          '/auth/',
          '/compare',
          '/admin',
          '/vendor-portal',
          '/order-confirmation',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
    ],
    sitemap: `https://${APEX}/sitemap.xml`,
  };
}
