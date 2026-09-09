import { cookies, headers } from 'next/headers';
import type { MetadataRoute } from 'next';
import { detectRegionAndLanguage } from '@Storegrill/shared';
import { regionByKey } from '../lib/regions';

function resolveLanguage(): { lang: string; dir: 'ltr' | 'rtl' } {
  const cookieStore = cookies();
  const raw = cookieStore.get('sg_prefs')?.value;
  let language = '';

  if (raw) {
    try {
      const prefs = JSON.parse(raw) as { regionKey?: string; language?: string };
      const region = prefs.regionKey ? regionByKey(prefs.regionKey) : undefined;
      if (region && prefs.language && region.languages.some(l => l.code === prefs.language)) {
        language = prefs.language;
      } else if (region) {
        language = region.languages[0].code;
      }
    } catch {
      // fall through to detection
    }
  }

  if (!language) {
    const country =
      headers().get('cf-ipcountry') || headers().get('x-azure-geo-country') || undefined;
    const detected = detectRegionAndLanguage(headers().get('accept-language'), country);
    language = detected.language || 'en';
  }

  return { lang: language, dir: language === 'ar' ? 'rtl' : 'ltr' };
}

export default function manifest(): MetadataRoute.Manifest {
  const { lang, dir } = resolveLanguage();
  return {
    name: 'Storegrill — Online Shopping Marketplace',
    short_name: 'Storegrill',
    description:
      'Shop millions of products from verified vendors with local currency, payments and delivery across 44 regions worldwide.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#1c073d',
    theme_color: '#1c073d',
    categories: ['shopping'],
    lang,
    dir,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-monochrome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' },
    ],
    shortcuts: [
      { name: "Today's Deals", short_name: 'Deals', url: '/deals', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Basket', short_name: 'Basket', url: '/cart', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
      { name: 'Track order', short_name: 'Track', url: '/track', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
    ],
  };
}