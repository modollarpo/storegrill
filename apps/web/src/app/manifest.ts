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
    background_color: '#1c073d',
    theme_color: '#1c073d',
    categories: ['shopping'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-16.svg',  sizes: '16x16',   type: 'image/svg+xml' },
      { src: '/icons/icon-32.svg',  sizes: '32x32',   type: 'image/svg+xml' },
      { src: '/icons/icon-48.svg',  sizes: '48x48',   type: 'image/svg+xml' },
      { src: '/icons/icon-96.svg',  sizes: '96x96',   type: 'image/svg+xml' },
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/maskable-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icons/maskable-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: "Today's Deals", short_name: 'Deals', url: '/deals', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Basket', short_name: 'Basket', url: '/cart', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Track order', short_name: 'Track', url: '/track', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
    ],
  };
}
