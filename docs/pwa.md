# Progressive Web App (PWA)

Storegrill's storefront is an installable PWA built with zero additional dependencies: a
hand-rolled service worker, the Next.js `manifest.ts` convention, and a client provider for
install/update UX.

## Architecture

| Piece | File | Role |
| --- | --- | --- |
| Web app manifest | `apps/web/src/app/manifest.ts` | Served at `/manifest.webmanifest`: standalone display, brand purple theme (`#4c12a1`), 5 icon entries incl. maskable, 3 app shortcuts (Deals, Basket, Track order) |
| Service worker | `apps/web/public/sw.js` | Versioned caching layer (see strategies below) |
| Offline fallback | `apps/web/src/app/offline/page.tsx` | Branded "You're offline" page; precached at SW install, served when navigation fails and no cached copy exists |
| Runtime UX | `apps/web/src/components/providers/PWAProvider.tsx` | SW registration, update prompt, install banner, online/offline toasts |
| Icons | `apps/web/public/icons/`, `src/app/icon.*`, `src/app/apple-icon.png` | 192/512 PNG, maskable variants (flame scaled into the 80% safe zone on full-bleed purple), SVG any, 180 apple-touch |

## Service worker strategy (`sw.js`)

All caches are prefixed `sg-` and suffixed with the release version (`v1`). Bump `VERSION` to
invalidate everything on deploy; old caches are deleted on activate.

- **Navigations** — network-first with a 4s timeout; successful HTML responses cached in
  `sg-pages`; falls back to the cached page, then `/offline`.
- **API GETs** (`/api/*`) — network-first with a 3s timeout, stale responses served from
  `sg-api` with an `X-SG-Cache: stale` header. Non-GET requests are never intercepted.
- **Immutable static** (`/_next/static/`, logo, placeholder) — cache-first in `sg-assets`.
- **Images** (`/_next/image`, media extensions) — stale-while-revalidate in `sg-images`,
  trimmed to 200 entries.
- Same-origin GET only; cross-origin and non-GET pass through untouched.

## Update flow

New SW installs and waits. `PWAProvider` detects the waiting worker, shows an
"Update available" banner; accepting posts `SKIP_WAITING`, and the controller change reloads
the tab exactly once. A hourly `registration.update()` check runs in the background.

## Install flow

`beforeinstallprompt` is captured and surfaced as an in-app install card (dismissals persist in
localStorage under `sg-install-dismissed`). `appinstalled` fires a success toast.

## Verification checklist (all verified live)

1. `/manifest.webmanifest` returns valid JSON with icons + shortcuts.
2. SW registers, activates and controls the page on second load.
3. Precache contains all shell URLs (`sg-shell-v1`).
4. With all network requests blocked: visited routes replay from `sg-pages`; unvisited routes
   render the cached `/offline` page.
5. Production build passes; manifest/apple-icon routes appear in the build output.
