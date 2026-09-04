# StoreGrill Design System — apps/web

Single source of truth: `apps/web/src/design-system/tokens.ts` + `tailwind.config.ts` + `src/app/globals.css`.
Component prompt and quality bar: `PROMPTS/frontend-overhaul.md`.
Enforcement: `npm run gate:ui` (no raw hex in components, no mojibake/corrupted characters).

## Brand

| Token | Value | Usage |
|---|---|---|
| `ember` (action primary) | `#4c12a1` | links, nav, filters, all commerce CTAs, selected states, timers |
| `ember-dark` | `#400e8a` | hover, gradient end |
| `ember-deep` | `#320b6e` | active/pressed |
| `ember-light` | `#7a4bc9` | borders on tinted surfaces |
| `ember-pale` | `#f2ebfb` | tinted chips, icon chips, promo backgrounds |

One brand color owns everything interactive. Errors are never brand-colored:
`feedback-danger #C41919` (+bg `#FDF0F0`), success `#007B4B`, warning `#B45309`, info `#1954B8`.

## Foundations

- **Type**: Outfit (self-hosted variable font via `@fontsource-variable/outfit`; weights 100–900), falling back to system sans (`-apple-system, Segoe UI, Roboto, Helvetica Neue, Arial`). JetBrains Mono only for code/order IDs.
- **Radii**: 4px component language (`rounded-xs`). Max 6px on oversized surfaces.
- **Elevation**: flat by default; borders over shadows; shadows for overlays, sticky header, card hover only.
- **Rails**: `.container-fluid` / `.container-site` = 1504px centered, gutters 16/32/56.
- **Motion**: 100ms micro, 200ms standard, 350ms overlays, `cubic-bezier(0.16,1,0.3,1)`. Transform/opacity only. Global `prefers-reduced-motion` kill-switch in globals.css.

## Rules that prevent past bugs

1. **Prices** render only via `PriceDisplay` → `lib/format.ts#splitPrice` (Intl `formatToParts`). Regression tests lock `$299.99` and thousands grouping.
2. **Icons are SVG** (24px viewBox, stroke 1.8, currentColor). Emoji are not icons — they corrupt across encodings/platforms.
3. **Encoding**: UTF-8 no BOM everywhere; non-ASCII never written through console shells; `npm run gate:ui` greps for mojibake signatures.
4. **No undefined utilities**: classes used in TSX must exist in the theme (the old `container-fluid` full-bleed bug). Skeleton radii are mapped explicitly, never string-interpolated.
5. **Brand logos are exempt from theming**: payment marks (Klarna/Mastercard), social OAuth marks — allowlisted in `scripts/ui-gates.mjs`.

## Accessibility baseline

- Skip link (`skip-link`) to `#main-content`; focus rings 2px offset brand purple.
- Drawer primitive: focus trap, Escape, focus return, scroll lock, `role="dialog"` + `aria-modal`.
- Live regions (polite): basket count in Header, toast viewport.
- Forms: label-for, `aria-describedby` errors with `role="alert"`, required = icon AND text.
- Prices expose spoken `aria-label`s; timers use `tabular-nums`.

## Component inventory (storefront)

AnnouncementBar (marquee, 24h dismiss cookie) · Header (utility bar, mega categories strip, search, region/account/basket) · Footer (newsletter, 5 columns, PaymentLogos, legal) · CampaignHero promo grid · CategoryQuickNav chips · ProductCard · DealsOfTheDay + Countdown chip · TrustBar (SVG icons) · RecentlyViewed · CartDrawer (focus-trapped) · PriceDisplay · AddToCartButton · WishlistButton · Badge · StarRating · Toast · Skeleton/SkeletonProductGrid · Drawer · Button/Input/Select · CookieBanner.

## Verification

Per change: `npm run typecheck` + `npm run lint` + `gate:ui` + targeted vitest + browser spot-check asserting computed styles at 375px/1440px. See PROMPTS/frontend-overhaul.md for the full loop.
