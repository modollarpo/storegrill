import type { HomeHeroSlide } from './home-content-build';

// Fallback editorial deal slides for the hero carousel. These surface between
// the storefront value-prop card and the real live-deal slides so the hero is
// never empty while deals are still being promoted by merchants. Copy is
// deliberately generic and links to the live deals hub, never to invented
// products/brands. Images are Storegrill's own banner photography.
export const FALLBACK_HERO_DEALS: HomeHeroSlide[] = [
  {
    title: 'Evening wind-down',
    subtitle: 'Curated daily deals, refreshed every morning',
    image: '/banners/10254154.jpeg',
    href: '/deals',
    priceMinorUnits: 8999,
    currencyCode: 'GBP',
    listPriceMinorUnits: 11499,
    discountPercent: 22,
    overlayTint: 'bg-rose-900/15',
  },
  {
    title: 'Bright mornings',
    subtitle: 'Small appliances, big savings',
    image: '/banners/10272305.jpeg',
    href: '/deals',
    priceMinorUnits: 5450,
    currencyCode: 'GBP',
    listPriceMinorUnits: 6999,
    discountPercent: 22,
    overlayTint: 'bg-amber-900/15',
  },
  {
    title: 'Everyday carry',
    subtitle: 'Best-value upgrades of the week',
    image: '/banners/10295528.jpeg',
    href: '/deals',
    priceMinorUnits: 12999,
    currencyCode: 'GBP',
    listPriceMinorUnits: 17499,
    discountPercent: 26,
    overlayTint: 'bg-sky-900/15',
  },
  {
    title: 'Smart home picks',
    subtitle: 'Live deals in tech and accessories',
    image: '/banners/10301984.jpeg',
    href: '/deals',
    priceMinorUnits: 19900,
    currencyCode: 'GBP',
    listPriceMinorUnits: 24900,
    discountPercent: 20,
    overlayTint: 'bg-indigo-900/15',
  },
  {
    title: 'Cosy corner edits',
    subtitle: 'Seasonal essentials, best pricing',
    image: '/banners/M10211929_pink.jpeg',
    href: '/deals',
    priceMinorUnits: 4275,
    currencyCode: 'GBP',
    listPriceMinorUnits: 5999,
    discountPercent: 29,
    overlayTint: 'bg-emerald-900/15',
  },
  {
    title: 'Kitchen confidence',
    subtitle: 'Featured deals from leading brands',
    image: '/banners/M10267844_graphite.jpeg',
    href: '/deals',
    priceMinorUnits: 31500,
    currencyCode: 'GBP',
    listPriceMinorUnits: 39900,
    discountPercent: 21,
    overlayTint: 'bg-slate-900/15',
  },
];