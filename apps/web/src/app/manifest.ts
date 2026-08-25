import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Storegrill — Online Shopping Marketplace',
    short_name: 'Storegrill',
    description:
      'Shop millions of products from verified vendors with local currency, payments and delivery across 44 regions worldwide.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4c12a1',
    categories: ['shopping'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: "Today's Deals", short_name: 'Deals', url: '/deals', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Basket', short_name: 'Basket', url: '/cart', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Track order', short_name: 'Track', url: '/track', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
