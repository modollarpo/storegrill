'use client';

import Link from 'next/link';
import { Children, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';
import { regionPromoContent } from '@/lib/region-content';
import { ProductCard, type ProductCardData } from '@/components/commerce/ProductCard';

// ─── Shared scroll helper ────────────────────────────────────────────────────

function snapScroll(el: HTMLElement | null, dir: 1 | -1) {
  if (!el || el.children.length === 0) return;
  const nodes = Array.from(el.children) as HTMLElement[];
  const max = el.scrollWidth - el.clientWidth;
  const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  const stopOf = (n: HTMLElement) => Math.min(max, Math.max(0, Math.round(n.offsetLeft - pad)));
  let best = 0, bestDist = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.abs(stopOf(n) - el.scrollLeft);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  let next = (best + dir + nodes.length) % nodes.length;
  let g = 0;
  while (next !== best && Math.abs(stopOf(nodes[next]) - stopOf(nodes[best])) < 4 && g++ < nodes.length) {
    next = (next + dir + nodes.length) % nodes.length;
  }
  el.scrollTo({ left: stopOf(nodes[next]), behavior: 'smooth' });
}

function NavBtn({ dir, label, onClick }: { dir: 1 | -1; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-border text-text-primary hover:bg-ember hover:text-white hover:border-ember opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      style={{ [dir === -1 ? 'left' : 'right']: '8px' }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" d={dir === -1 ? 'M15.75 19.5L8.25 12l7.5-7.5' : 'M8.25 4.5l7.5 7.5-7.5 7.5'} />
      </svg>
    </button>
  );
}

// ─── TrendingSlider (used on PDP page) ───────────────────────────────────────

export function TrendingSlider({ children }: { children: React.ReactNode[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  return (
    <div className="relative group/slider">
      <ul
        ref={scroller}
        data-testid="trending-scroller"
        className="flex gap-6 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6"
      >
        {Children.map(children, child =>
          child ? (
            <li className="w-[75%] sm:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0 snap-start">
              {child}
            </li>
          ) : null
        )}
      </ul>
      <NavBtn dir={-1} label="Previous" onClick={() => snapScroll(scroller.current, -1)} />
      <NavBtn dir={1} label="Next" onClick={() => snapScroll(scroller.current, 1)} />
    </div>
  );
}

// ─── §1 TrustBar ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { title: 'Free Shipping', iconPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
  { title: '30-Day Returns', iconPath: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99' },
  { title: 'Buyer Protection', iconPath: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { title: 'Secure Checkout', iconPath: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
] as const;

export function TrustBar({ freeShippingThreshold, currency }: { freeShippingThreshold: number; currency: string }) {
  const threshold = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(freeShippingThreshold / 100);
  const items = [
    { ...TRUST_ITEMS[0], body: `Free shipping over ${threshold}` },
    { ...TRUST_ITEMS[1], body: '30-day hassle-free returns' },
    { ...TRUST_ITEMS[2], body: 'Every order covered' },
    { ...TRUST_ITEMS[3], body: 'Stripe & PayPal protected' },
  ];
  return (
    <section aria-label="Why shop with Storegrill" className="bg-midnight border-b border-ember-deep">
      <div className="container-fluid py-2.5 md:py-3">
        <ul className="flex overflow-x-auto scrollbar-none items-center justify-start sm:justify-center gap-x-6 sm:gap-x-10 snap-x snap-mandatory" role="list">
          {items.map(item => (
            <li key={item.title} className="flex items-center gap-2 shrink-0 snap-start">
              <span aria-hidden="true" className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-white/20">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                </svg>
              </span>
              <p className="text-xs sm:text-sm text-white font-semibold whitespace-nowrap">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── DealCardData (shared by CampaignHero + DealsOfTheDay) ───────────────────

export interface DealCardData {
  id: string;
  slug?: string;
  productId?: string;
  productName: string;
  image?: string;
  priceMinorUnits: number;
  listPriceMinorUnits?: number;
  currencyCode: string;
  endsAt?: string;
  dealLabel: string;
}

// ─── §2 CampaignHero ─────────────────────────────────────────────────────────

export interface DealTickerItem { label: string; href: string; }

interface HeroSlide {
  eyebrow: string;
  headline: string;
  subtitle: string;
  cta: { label: string; href: string };
  ghost: { label: string; href: string };
  image?: string;
}

export function CampaignHero({ dealTicker = [], regionKey, deals = [] }: { dealTicker?: DealTickerItem[]; regionKey: string; deals?: DealCardData[] }) {
  const hero = regionPromoContent(regionKey);
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);

  const dealSlides: HeroSlide[] = deals.slice(0, 3).map(d => ({
    eyebrow: d.dealLabel,
    headline: d.productName,
    subtitle: `Limited time deal — ends ${new Date(d.endsAt ?? 0).toLocaleDateString()}`,
    cta: { label: 'Shop deal', href: d.slug ? `/products/${d.slug}` : `/products/${d.productId}` },
    ghost: { label: 'Browse all', href: '/deals' },
    image: d.image,
  }));

  const fallbackSlides: HeroSlide[] = [
    {
      eyebrow: 'Live deals today',
      headline: 'Prices that make\nyou look twice.',
      subtitle: hero.heroSubtitle,
      cta: { label: 'Shop the sale', href: '/deals' },
      ghost: { label: 'Browse all products', href: '/products' },
    },
    {
      eyebrow: 'New arrivals',
      headline: 'Just landed.\nJust better.',
      subtitle: `Fresh products from verified sellers, delivered across ${hero.currency} markets.`,
      cta: { label: 'Discover new', href: '/products?sort=newest' },
      ghost: { label: 'Meet our sellers', href: '/vendors' },
    },
    ...(hero.couponCode
      ? [{
          eyebrow: 'Limited-time code',
          headline: `${hero.couponDiscountPercent}% off\neverything.`,
          subtitle: `Use code ${hero.couponCode} at checkout for instant savings.`,
          cta: { label: 'Shop now', href: '/deals' },
          ghost: { label: 'Browse all products', href: '/products' },
        }]
      : [{
          eyebrow: 'Secure checkout',
          headline: 'Shop with\nconfidence.',
          subtitle: 'Stripe and PayPal protected checkout with easy returns on every order.',
          cta: { label: 'Start shopping', href: '/products' },
          ghost: { label: 'Delivery options', href: '/shipping' },
        }]),
  ];

  const slides = dealSlides.length > 0 ? dealSlides : fallbackSlides;
  const current = slides[slide];

  function goTo(i: number) {
    if (i === slide) return;
    setFading(true);
    setTimeout(() => {
      setSlide(i);
      setFading(false);
    }, 180);
  }

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlide(s => (s + 1) % slides.length);
        setFading(false);
      }, 180);
    }, 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section aria-label="Featured campaign" className="relative overflow-hidden bg-smoke-25">
      {/* Content */}
      <div className="relative container-site py-10 sm:py-14 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-6 lg:gap-12 items-center">
          {/* Copy */}
          <div className={cn('transition-opacity duration-180', fading ? 'opacity-0' : 'opacity-100')}>
            {/* Eyebrow pill */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/8 border border-ember/15 mb-5 md:mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-ember">{current.eyebrow}</span>
            </span>

            {/* Headline */}
            <h2 className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold text-text-primary tracking-[-0.03em] leading-[0.95] mb-4 md:mb-5 whitespace-pre-line">
              {current.headline}
            </h2>

            {/* Subtitle */}
            <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-md mb-8 md:mb-10">
              {current.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={current.cta.href}
                className="h-12 px-7 md:px-9 rounded-full bg-ember text-white font-extrabold text-sm tracking-wide shadow-lg shadow-ember/20 hover:bg-ember-dark hover:shadow-xl hover:shadow-ember/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all inline-flex items-center gap-2"
              >
                {current.cta.label}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </Link>
              <Link
                href={current.ghost.href}
                className="h-12 px-7 md:px-9 rounded-full bg-transparent text-text-primary font-bold text-sm border border-border-strong hover:bg-surface-sunken hover:border-text-tertiary transition-all inline-flex items-center"
              >
                {current.ghost.label}
              </Link>
            </div>

            {/* Slide indicators */}
            <div className="flex items-center gap-2 mt-8 md:mt-10">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === slide ? 'w-8 h-2 bg-ember' : 'w-2 h-2 bg-text-disabled hover:bg-text-tertiary'
                  )}
                />
              ))}
              <span className="ml-2 text-xs font-medium text-text-tertiary tabular-nums">
                {slide + 1}/{slides.length}
              </span>
            </div>
          </div>

          {/* Product image — only shown for deal slides or when there's an image */}
          {current.image && (
            <div className={cn(
              'relative w-full max-w-[320px] md:max-w-none md:w-[380px] lg:w-[440px] aspect-square mx-auto md:mx-0 transition-opacity duration-180',
              fading ? 'opacity-0' : 'opacity-100'
            )}>
              <div className="absolute inset-4 md:inset-8 rounded-3xl bg-surface shadow-2xl shadow-black/5 border border-border/50 overflow-hidden">
                <Image
                  src={storefrontImage(current.image) || '/product-placeholder.svg'}
                  alt={current.headline}
                  fill
                  className="object-contain p-6 md:p-10"
                  sizes="(max-width: 768px) 320px, 440px"
                />
              </div>
              {/* Decorative ring */}
              <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-ember/10 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Deal ticker */}
      {dealTicker.length > 0 && (
        <div className="relative bg-surface border-t border-border overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...dealTicker, ...dealTicker].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 text-xs font-bold text-text-secondary hover:text-ember transition-colors shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ember/60 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


// ─── §3 BrandLogoBar ─────────────────────────────────────────────────────────

const BRANDS = ['Samsung', 'Apple', 'Sony', 'Nike', 'Adidas', 'Bosch', 'Philips', 'LG', 'Dyson', 'Canon', 'Dell', 'HP', 'Bose', 'JBL', 'Panasonic'];

export function BrandLogoBar() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;

  return (
    <section aria-label="Trusted brands" className="bg-surface border-b border-border overflow-hidden">
      <div className="py-4">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView="auto"
          loop={true}
          autoplay={{ delay: 2500, disableOnInteraction: false }}
          className="px-4"
        >
          {BRANDS.map((name, i) => (
            <SwiperSlide key={i} className="!w-auto">
              <Link href={`/products?brand=${encodeURIComponent(name)}`}
                className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-surface-sunken text-sm font-bold text-text-secondary hover:text-ember hover:bg-ember/5 hover:border-ember border border-border transition-all">
                {name}
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

// ─── §4 CategoryQuickNav ─────────────────────────────────────────────────────

export interface QuickNavItem { name: string; slug: string; }

const CATEGORY_ACCENTS = [
  'from-ember-deep to-ember',
  'from-tealink to-tealink',
  'from-midnight to-charcoal',
  'from-deal to-deal',
  'from-charcoal-light to-charcoal-mid',
  'from-ember to-ember-dark',
];

function categoryIcon(slug: string): React.ReactNode {
  const s = slug.toLowerCase();
  if (/electron|phone|mobile|gadget|tablet|headphon|audio|speaker|camera|smart/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    );
  }
  if (/computer|laptop|pc|tech|monitor|keyboard|mouse|printer|software/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (/home|kitchen|furniture|appliance|decor|garden|outdoor|living/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (/fashion|cloth|wear|apparel|shoe|bag|accessor|jewel|watch/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    );
  }
  if (/beauty|personal|care|health|cosmetic|skincare|hair|makeup/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  if (/sport|fitness|gym|outdoor|camp|hik|run|cycl|swim|yoga/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  if (/book|read|novel|magaz|comic|educat/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    );
  }
  if (/toy|game|kid|baby|child/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M8 8V6a4 4 0 118 0v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    );
  }
  if (/automot|car|vehicle|motor|bike/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-6.06A1 1 0 0012.38 4H5.62a1 1 0 00-.92.61L2 11l-2 1.15V16h3" />
        <circle cx="6.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </svg>
    );
  }
  if (/pet|animal|dog|cat|bird|fish/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    );
  }
  if (/food|grocer|snack|drink|beverage|coffee|tea/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    );
  }
  if (/office|stationer|pen|paper/.test(s)) {
    return (
      <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function CategoryQuickNav({ categories = [] }: { categories?: QuickNavItem[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  if (categories.length < 4) return null;
  return (
    <nav aria-label="Shop by category" className="bg-surface border-b border-border">
      <div className="container-fluid py-8 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">Shop by category</h2>
          <Link href="/products" className="text-sm font-bold text-ember hover:underline underline-offset-4 hidden sm:inline-flex items-center gap-1">
            View all <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
        <div className="relative group/slider">
          <ul ref={scroller} className="flex gap-4 md:gap-6 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0" role="list">
            {categories.slice(0, 12).map((cat, i) => (
              <li key={cat.slug} className="snap-start shrink-0">
                <Link href={`/products?category=${encodeURIComponent(cat.slug)}`} aria-label={cat.name} className="group block w-[96px] md:w-[112px] text-center">
                  <span className={`relative block w-[96px] h-[96px] md:w-[112px] md:h-[112px] rounded-full bg-gradient-to-br ${CATEGORY_ACCENTS[i % CATEGORY_ACCENTS.length]} text-white grid place-items-center mx-auto mb-3 shadow-md group-hover:ring-2 group-hover:ring-ember/20 group-hover:shadow-lg transition-all`}>
                    {categoryIcon(cat.slug)}
                  </span>
                  <span className="block text-xs font-bold text-text-primary group-hover:text-ember transition-colors leading-tight truncate">{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <NavBtn dir={-1} label="Previous categories" onClick={() => snapScroll(scroller.current, -1)} />
          <NavBtn dir={1} label="Next categories" onClick={() => snapScroll(scroller.current, 1)} />
        </div>
      </div>
    </nav>
  );
}

// ─── §5 DealsOfTheDay ────────────────────────────────────────────────────────

function useMidnightCountdown() {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    function tick() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setRemaining(Math.max(0, midnight.getTime() - now.getTime()));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(remaining / 1000);
  return { hours: String(Math.floor(s / 3600)).padStart(2, '0'), minutes: String(Math.floor((s % 3600) / 60)).padStart(2, '0'), seconds: String(s % 60).padStart(2, '0') };
}

function MidnightTimer() {
  const time = useMidnightCountdown();
  return (
    <div className="flex items-center gap-1" role="timer" aria-label="Deals reset at midnight">
      {([time.hours, time.minutes, time.seconds] as const).map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-sunken border border-border text-sm font-extrabold text-text-primary tabular-nums">
            {v}
          </span>
          {i < 2 && <span className="text-xs font-bold text-text-tertiary">:</span>}
        </span>
      ))}
    </div>
  );
}

function useCountdown(endsAt?: string) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();
    function tick() { setRemaining(Math.max(0, target - Date.now())); }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (remaining === null) return null;
  const s = Math.floor(remaining / 1000);
  return { hours: String(Math.floor(s / 3600)).padStart(2, '0'), minutes: String(Math.floor((s % 3600) / 60)).padStart(2, '0'), seconds: String(s % 60).padStart(2, '0') };
}

function DealCountdown({ endsAt }: { endsAt?: string }) {
  const time = useCountdown(endsAt);
  if (!time) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-deal mt-2" role="timer">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
      Ends in {time.hours}:{time.minutes}:{time.seconds}
    </span>
  );
}

export function DealsOfTheDay({ deals }: { deals: DealCardData[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  if (deals.length === 0) return null;
  return (
    <section className="bg-surface-sunken border-b border-border" aria-label="Deals of the day">
      <div className="container-site py-10 md:py-14">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-ember/10" aria-hidden="true">
                <svg className="w-5 h-5 text-ember" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">Deals of the Day</h2>
                <p className="text-xs font-medium text-text-tertiary mt-0.5">Refreshes daily at midnight</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Resets in</span>
              <MidnightTimer />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => snapScroll(scroller.current, -1)}
                aria-label="Scroll deals left"
                className="w-9 h-9 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-ember hover:text-ember hover:shadow-md transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                type="button"
                onClick={() => snapScroll(scroller.current, 1)}
                aria-label="Scroll deals right"
                className="w-9 h-9 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-ember hover:text-ember hover:shadow-md transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>

            <Link href="/deals" className="text-sm font-bold text-ember hover:underline underline-offset-4 hidden md:inline-flex items-center gap-1">
              View all <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        </header>

        {/* Cards grid */}
        <ul ref={scroller} className="flex gap-4 md:gap-5 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0" role="list">
          {deals.map(deal => {
            const saving = (deal.listPriceMinorUnits ?? 0) > deal.priceMinorUnits ? (deal.listPriceMinorUnits! - deal.priceMinorUnits) : 0;
            const savePct = deal.listPriceMinorUnits && saving > 0 ? Math.round((saving / deal.listPriceMinorUnits) * 100) : 0;
            const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(n / 100);
            const href = deal.slug ? `/products/${deal.slug}` : deal.productId ? `/products/${deal.productId}` : '/deals';
            return (
              <li key={deal.id} className="snap-start shrink-0 w-[72%] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)]">
                <Link
                  href={href}
                  className="group block bg-surface rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-ember/30 transition-all duration-300 h-full flex flex-col"
                  suppressHydrationWarning
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-surface-sunken shrink-0 overflow-hidden">
                    {deal.image && (
                      <Image
                        src={storefrontImage(deal.image) || '/product-placeholder.svg'}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 280px, (max-width: 1024px) 300px, 260px"
                        loading="lazy"
                        className="object-contain p-5 group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    )}
                    {savePct > 0 && (
                      <span className="absolute top-3 right-3 bg-deal text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                        -{savePct}%
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col p-4 pt-3.5">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-ember transition-colors line-clamp-2 leading-snug mb-auto">
                      {deal.productName}
                    </p>

                    <div className="mt-3">
                      {/* Price row */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-text-primary tabular-nums" suppressHydrationWarning>
                          {fmt(deal.priceMinorUnits)}
                        </span>
                        {saving > 0 && deal.listPriceMinorUnits && (
                          <span className="text-xs text-text-tertiary line-through tabular-nums" suppressHydrationWarning>
                            {fmt(deal.listPriceMinorUnits)}
                          </span>
                        )}
                      </div>

                      {saving > 0 && (
                        <span className="inline-flex items-center text-[11px] font-bold text-deal mt-1" suppressHydrationWarning>
                          Save {fmt(saving)}
                        </span>
                      )}

                      <DealCountdown endsAt={deal.endsAt} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile: View all deals link */}
        <div className="mt-6 text-center md:hidden">
          <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm font-bold text-ember hover:underline underline-offset-4">
            View all deals
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── §6 TabbedProductCarousel ────────────────────────────────────────────────

export interface TabbedProductTab { label: string; products: React.ReactNode[]; }

export function TabbedProductCarousel({ tabs }: { tabs: TabbedProductTab[] }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLUListElement>(null);
  const activeProducts = tabs[active]?.products ?? [];
  return (
    <section className="bg-surface-sunken border-b border-border" aria-labelledby="trending-heading">
      <div className="container-site py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 id="trending-heading" className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">What&apos;s Trending Right Now</h2>
            <p className="text-xs font-medium text-text-tertiary mt-1">Updated daily from our top vendors</p>
          </div>
          <div className="flex items-center gap-2 bg-surface rounded-xl border border-border p-1">
            {tabs.map((tab, i) => (
              <button key={tab.label} type="button" onClick={() => setActive(i)}
                className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all', i === active ? 'bg-ember text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken')}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative group/slider">
          <ul ref={scroller} className="flex gap-5 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0">
            {activeProducts.map((child, i) => <li key={i} className="w-[75%] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] shrink-0 snap-start">{child}</li>)}
          </ul>
          <NavBtn dir={-1} label="Previous products" onClick={() => snapScroll(scroller.current, -1)} />
          <NavBtn dir={1} label="Next products" onClick={() => snapScroll(scroller.current, 1)} />
        </div>
      </div>
    </section>
  );
}

// ─── §8 CategoryBannerWithProducts ───────────────────────────────────────────

export interface CategoryBannerWithProductsProps {
  title: string; subtitle?: string; description?: string; ctaLabel: string; ctaHref: string;
  bannerImage: string; bannerBg: string; fromPrice?: string; products: ProductCardData[];
}

export function CategoryBannerWithProducts({ title, subtitle, description, ctaLabel, ctaHref, bannerImage, bannerBg, fromPrice, products }: CategoryBannerWithProductsProps) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="container-site py-10 md:py-14">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 md:gap-8">
          <Link href={ctaHref} className="group relative overflow-hidden rounded-2xl min-h-[320px] lg:min-h-0 flex flex-col justify-end" style={{ backgroundColor: bannerBg }}>
            <Image src={bannerImage} alt={title} fill sizes="320px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <span className="relative z-10 flex flex-col p-8">
              {subtitle && <span className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">{subtitle}</span>}
              <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2">{title}</span>
              {fromPrice && <span className="text-sm font-semibold text-white/70 mb-4">From {fromPrice}</span>}
              {description && <span className="text-sm text-white/60 mb-6 leading-relaxed">{description}</span>}
              <span className="inline-flex w-fit items-center gap-1.5 h-10 px-6 rounded-full bg-white text-ember text-sm font-extrabold shadow-md group-hover:bg-white/90 transition-all">
                {ctaLabel} <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </span>
            </span>
          </Link>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map(product => <ProductCard key={product.id} product={{ ...product, vendor: product.vendor ?? undefined }} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── §10 AppDownloadBanner ───────────────────────────────────────────────────

export function AppDownloadBanner() {
  return (
    <section className="bg-surface-sunken border-b border-border" aria-labelledby="app-heading">
      <div className="container-site py-10 md:py-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-midnight via-ember-deep to-ember text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between px-8 md:px-16 py-12 lg:py-0 gap-10">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full blur-3xl bg-white/10" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full blur-2xl bg-white/5" />
          <div className="relative z-10 lg:py-16 max-w-lg text-center lg:text-left">
            <h2 id="app-heading" className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight text-white">Get the Storegrill App</h2>
            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">Shop faster, track orders in real-time, and unlock exclusive mobile-only deals.</p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button className="px-6 py-3 rounded-2xl bg-white text-midnight font-extrabold hover:bg-white/90 transition-colors inline-flex items-center gap-2.5 shadow-xl">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.7 3.58-.8 1.58-.1 2.94.43 3.84 1.44-3.21 1.77-2.6 6.1.48 7.33-.76 1.76-1.89 3.29-2.98 4.2zm-4.32-13.6c-.19-1.8 1.14-3.56 2.9-3.79.28 1.83-1.39 3.55-2.9 3.79z" /></svg>
                <span className="flex flex-col items-start leading-none"><span className="text-[9px] opacity-70">Download on the</span><span className="text-sm font-extrabold">App Store</span></span>
              </button>
              <button className="px-6 py-3 rounded-2xl bg-white/10 text-white font-extrabold border border-white/20 hover:bg-white/20 transition-colors inline-flex items-center gap-2.5 backdrop-blur-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.502-1.385V3.199c0-.528.204-1.01.501-1.385zM14.92 10.87L4.795 4.972l9.043 9.043 1.082-3.145zm1.188.688l3.198 1.854c.772.447.772 1.173 0 1.621l-3.198 1.854-1.745-1.745 1.745-3.584zM14.92 13.13l-1.082-3.145-9.043 9.043 10.125-5.898z" /></svg>
                <span className="flex flex-col items-start leading-none"><span className="text-[9px] opacity-70">Get it on</span><span className="text-sm font-extrabold">Google Play</span></span>
              </button>
            </div>
          </div>
          <div className="relative z-10 hidden lg:flex items-end justify-center h-[380px] w-72 shrink-0">
            <div className="relative w-56 h-[380px] bg-white rounded-[2.5rem] border-4 border-charcoal shadow-2xl overflow-hidden text-black">
              <div className="absolute top-0 inset-x-0 flex justify-center pt-2 bg-white z-20 pb-2"><div className="w-16 h-4 bg-black/10 rounded-full" /></div>
              <div className="absolute top-0 inset-x-0 bottom-0 flex flex-col pt-8 bg-surface-page">
                <div className="h-12 flex items-center justify-center px-4 bg-ember text-white shadow-sm shrink-0">
                  <div className="flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-white.svg" alt="Storegrill" className="h-6 w-auto" />
                  </div>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="rounded-xl bg-white p-3 flex gap-3 shadow-sm">
                      <div className="w-12 h-12 rounded-lg shrink-0 bg-black/5" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2 bg-black/20 rounded-full w-3/4" />
                        <div className="h-2 bg-black/10 rounded-full w-1/2" />
                        <div className="h-3 rounded-full w-1/3 mt-2 bg-deal" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── §11 VendorSpotlight ─────────────────────────────────────────────────────

export interface VendorSpotlightItem { storeName: string; slug: string; rating: number; reviewCount: number; logo?: string; description?: string; }

export function VendorSpotlight({ vendors }: { vendors: VendorSpotlightItem[] }) {
  if (vendors.length === 0) return null;
  return (
    <section className="border-b border-border bg-surface" aria-labelledby="vendor-spotlight-heading">
      <div className="container-site py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 id="vendor-spotlight-heading" className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">Meet Our Top Sellers</h2>
            <p className="text-xs font-medium text-text-tertiary mt-1">Curated marketplace</p>
          </div>
          <Link href="/vendor/apply" className="h-10 px-5 rounded-full border-2 border-ember text-ember text-sm font-bold hover:bg-ember hover:text-white transition-all inline-flex items-center gap-1.5">
            Become a seller <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {vendors.slice(0, 3).map(v => (
            <Link key={v.slug} href={`/vendors/${v.slug}`} className="group relative rounded-2xl bg-surface border border-border p-6 flex items-start gap-5 hover:border-ember hover:shadow-xl transition-all">
              <span className="w-20 h-20 rounded-2xl bg-ember/10 text-ember-deep grid place-items-center font-extrabold text-2xl shrink-0 overflow-hidden border border-ember/20">
                {v.logo ? <img src={v.logo} alt="" className="w-full h-full object-cover" /> : v.storeName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="block text-base font-extrabold text-text-primary group-hover:text-ember transition-colors truncate pr-12">{v.storeName}</span>
                <span className="block text-sm text-text-secondary mt-1">
                  <span className="text-ember font-bold">&#9733; {v.rating > 0 ? v.rating.toFixed(1) : 'New'}</span>{' · '}{v.reviewCount.toLocaleString()} reviews
                </span>
                {v.description && <span className="block text-xs text-text-tertiary mt-2 line-clamp-2 leading-relaxed">{v.description}</span>}
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-ember">
                  Visit store <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── §12 RegionalTrust ───────────────────────────────────────────────────────

interface RegionalTrustProps { regionKey: string; paymentMethods: string[]; carriers: string[]; }

const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Card', paypal: 'PayPal', apple_pay: 'Apple Pay', google_pay: 'Google Pay',
  klarna: 'Klarna', afterpay: 'Afterpay', cash_on_delivery: 'Cash on Delivery', bank_transfer: 'Bank Transfer',
};

export function RegionalTrust({ paymentMethods, carriers }: RegionalTrustProps) {
  return (
    <section className="bg-surface-sunken border-t border-border" aria-label="Shopping trust signals">
      <div className="container-site py-10 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {paymentMethods.length > 0 && (
            <div>
              <p className="text-xs font-extrabold text-text-tertiary uppercase tracking-widest mb-4">Accepted payments</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map(m => <span key={m} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-white text-xs font-bold text-text-secondary shadow-sm">{PAYMENT_LABELS[m] ?? m}</span>)}
              </div>
            </div>
          )}
          {carriers.length > 0 && (
            <div>
              <p className="text-xs font-extrabold text-text-tertiary uppercase tracking-widest mb-4">Delivery partners</p>
              <div className="flex flex-wrap gap-2">
                {carriers.map(c => (
                  <span key={c} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-white text-xs font-bold text-text-secondary shadow-sm gap-1.5">
                    <svg className="w-3.5 h-3.5 text-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-extrabold text-text-tertiary uppercase tracking-widest mb-4">Your data is protected</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-success/10">
                <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">SSL Encrypted</p>
                <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">256-bit SSL. All data transmitted securely.</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold text-text-tertiary uppercase tracking-widest mb-4">Our guarantee</p>
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-sm font-extrabold text-text-primary">Buyer Protection</p>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">Secure checkout · 30-day returns · Dispute resolution included.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── §13 Testimonials ────────────────────────────────────────────────────────

export interface TestimonialItem { name: string; role: string; avatar: string; quote: string; }

export function Testimonials({ items = [] }: { items?: TestimonialItem[] }) {
  const [isClient, setIsClient] = useState(false);
  const sliderRef = useRef<SwiperType | null>(null);
  useEffect(() => { setIsClient(true); }, []);
  if (items.length === 0 || !isClient) return null;
  return (
    <section className="border-b border-border bg-surface" aria-labelledby="testimonials-heading">
      <div className="container-site py-10 md:py-14">
        <div className="text-center mb-10">
          <h2 id="testimonials-heading" className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">What Our Customers Say</h2>
          <p className="text-xs font-medium text-text-tertiary mt-1">Real customers, real reviews</p>
        </div>
        <Swiper modules={[Autoplay, Pagination]} spaceBetween={20} slidesPerView={1}
          breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          autoplay={{ delay: 5000, disableOnInteraction: false }} pagination={{ clickable: true }}
          onSwiper={swiper => { sliderRef.current = swiper; }} className="pb-10">
          {items.map((t, i) => (
            <SwiperSlide key={i} className="h-auto">
              <div className="bg-surface border border-border rounded-2xl p-6 h-full flex flex-col shadow-sm hover:shadow-md hover:border-ember/30 transition-all">
                <span className="text-5xl font-extrabold leading-none mb-2 -mt-2 text-ember/20" aria-hidden="true">&ldquo;</span>
                <div className="flex items-center gap-0.5 mb-4">
                  {[0,1,2,3,4].map(j => <svg key={j} className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed flex-grow">{t.quote}</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                  <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-full border border-border" />
                  <div><p className="text-sm font-bold text-text-primary">{t.name}</p><p className="text-xs text-text-tertiary">{t.role}</p></div>
                  <span className="ml-auto inline-flex items-center text-[10px] font-bold gap-1 text-success">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75" /></svg>
                    Verified
                  </span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

// ─── RecentlyViewed (preserved for PDP) ──────────────────────────────────────

interface ViewedItem { slug: string; name: string; unitPriceMinorUnits: number; listPriceMinorUnits?: number; currencyCode: string; thumbnail?: string; }
const RECENTLY_VIEWED_KEY = 'storegrill-recently-viewed';

export function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<ViewedItem[]>([]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    function load() {
      try {
        const all = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]') as ViewedItem[];
        setItems(all.filter(i => i.slug !== currentSlug).slice(0, 8));
      } catch { setItems([]); }
    }
    load();
    window.addEventListener('storegrill:recently-viewed', load);
    return () => window.removeEventListener('storegrill:recently-viewed', load);
  }, [currentSlug]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth - el.clientWidth > 120);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <section className="border-b border-border bg-surface" aria-label="Pick up where you left off">
      <div className="container-fluid py-10 md:py-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-6 tracking-tight">Pick up where you left off</h2>
        <div className="relative group/slider">
          <ul ref={scrollerRef} data-testid="recent-scroller" className="flex gap-5 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0" role="list">
            {items.map(item => (
              <li key={item.slug} className="snap-start shrink-0 w-[75%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={`/products/${item.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface overflow-hidden hover:border-ember hover:shadow-lg transition-all">
                  <span className="relative block aspect-square bg-surface-sunken overflow-hidden">
                    {item.thumbnail && <Image src={storefrontImage(item.thumbnail) || '/product-placeholder.svg'} alt="" fill sizes="240px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-105 mix-blend-multiply" />}
                  </span>
                  <span className="flex flex-col p-4 grow">
                    <span className="text-sm font-semibold leading-snug text-text-primary line-clamp-2 min-h-[2.5rem] group-hover:text-ember transition-colors">{item.name}</span>
                    <span className="text-base font-extrabold mt-2 text-text-primary">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currencyCode }).format(item.unitPriceMinorUnits / 100)}
                    </span>
                    {item.listPriceMinorUnits && item.listPriceMinorUnits > item.unitPriceMinorUnits && (
                      <span className="text-xs text-text-tertiary line-through mt-0.5">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currencyCode }).format(item.listPriceMinorUnits / 100)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {scrollable && <>
            <NavBtn dir={-1} label="Previous recently viewed" onClick={() => snapScroll(scrollerRef.current, -1)} />
            <NavBtn dir={1} label="Next recently viewed" onClick={() => snapScroll(scrollerRef.current, 1)} />
          </>}
        </div>
      </div>
    </section>
  );
}

