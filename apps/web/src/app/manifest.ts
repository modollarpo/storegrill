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
      { src: '/icons/icon-16.png',  sizes: '16x16',   type: 'image/png' },
      { src: '/icons/icon-32.png',  sizes: '32x32',   type: 'image/png' },
      { src: '/icons/icon-48.png',  sizes: '48x48',   type: 'image/png' },
      { src: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: "Today's Deals", short_name: 'Deals', url: '/deals', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Basket', short_name: 'Basket', url: '/cart', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Track order', short_name: 'Track', url: '/track', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
    ],
  };
}
