const VERSION = 'v1';
const OFFLINE_URL = '/offline';

const SHELL_CACHE = `sg-shell-${VERSION}`;
const PAGE_CACHE = `sg-pages-${VERSION}`;
const ASSET_CACHE = `sg-assets-${VERSION}`;
const IMAGE_CACHE = `sg-images-${VERSION}`;
const API_CACHE = `sg-api-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, PAGE_CACHE, ASSET_CACHE, IMAGE_CACHE, API_CACHE];

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/logo.svg',
  '/product-placeholder.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
];

const NAV_TIMEOUT_MS = 4000;
const API_TIMEOUT_MS = 3000;
const MAX_IMAGE_ENTRIES = 200;

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.allSettled(PRECACHE_URLS.map(url => caches.open(SHELL_CACHE).then(c => c.add(url))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter(n => n.startsWith('sg-') && !CURRENT_CACHES.includes(n)).map(n => caches.delete(n)));
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(fetchPromise, ms) {
  return Promise.race([
    fetchPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}

function isCacheable(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'default');
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return fetch(request);
  }
}

async function handleApiGet(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await withTimeout(fetch(request), API_TIMEOUT_MS);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return new Response(cached.body, { ...cached, headers: { ...cached.headers, 'X-SG-Cache': 'stale' } });
    throw new Error('offline and not cached');
  }
}

async function handleStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleImage(request) {
  const cached = await caches.match(request);
  const fetchAndCache = async () => {
    try {
      const response = await fetch(request);
      if (isCacheable(response)) {
        const cache = await caches.open(IMAGE_CACHE);
        await cache.put(request, response.clone());
        await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  };
  return cached ? (fetchAndCache(), cached) : fetchAndCache();
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiGet(request).catch(() => Response.error()));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/product-placeholder.svg'
  ) {
    event.respondWith(handleStatic(request));
    return;
  }

  if (url.pathname.startsWith('/_next/image') || /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(handleImage(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
