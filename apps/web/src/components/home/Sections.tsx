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

// ─── §2 CampaignHero ─────────────────────────────────────────────────────────

export interface DealTickerItem { label: string; href: string; }

export function CampaignHero({ dealTicker = [] }: { dealTicker?: DealTickerItem[] }) {
  const hero = regionPromoContent('UK');
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      eyebrow: 'Summer Sale — Up to 60% off',
      headline: 'Shop Smarter,\nSave Bigger.',
      subtitle: hero.heroSubtitle,
      cta: { label: 'Shop the sale', href: '/deals' },
      ghost: { label: 'Browse all products', href: '/products' },
      accent: 'bg-amber-400',
    },
    {
      eyebrow: 'New Arrivals — Just landed',
      headline: 'Fresh Picks,\nFresh Prices.',
      subtitle: `Brand new products from verified sellers — delivered fast across ${hero.currency} regions.`,
      cta: { label: 'Discover new', href: '/products?sort=newest' },
      ghost: { label: 'Meet our sellers', href: '/vendors' },
      accent: 'bg-emerald-400',
    },
    {
      eyebrow: 'Earn 5% cashback — Every order',
      headline: 'Rewards on\nEverything.',
      subtitle: `Use code ${hero.couponCode} for ${hero.couponDiscountPercent}% off today — cashback stacks automatically.`,
      cta: { label: 'Start earning', href: '/deals' },
      ghost: { label: 'How it works', href: '/help/cashback' },
      accent: 'bg-yellow-300',
    },
  ];

  const current = slides[slide];

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section aria-label="Featured campaign" className="relative overflow-hidden bg-midnight">
      {/* Abstract Mesh Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-ember rounded-full blur-[120px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[100%] bg-deal rounded-full blur-[140px] opacity-30 pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-30%] left-[20%] w-[60%] h-[80%] bg-ember-light rounded-full blur-[100px] opacity-40 pointer-events-none mix-blend-screen" />
      <div className="relative container-fluid py-12 md:py-20">
        <div className="grid md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_420px] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full ${current.accent} animate-pulse`} />
              <span className="text-white/70 text-sm font-bold uppercase tracking-widest">{current.eyebrow}</span>
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none mb-5 whitespace-pre-line">{current.headline}</h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-lg mb-8">{current.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={current.cta.href} className="h-12 px-8 rounded-full bg-white text-ember font-extrabold text-sm shadow-xl hover:bg-white/90 hover:shadow-2xl transition-all inline-flex items-center">
                {current.cta.label}
                <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </Link>
              <Link href={current.ghost.href} className="h-12 px-8 rounded-full bg-white/10 text-white font-bold text-sm border border-white/20 hover:bg-white/20 transition-all inline-flex items-center backdrop-blur-sm">{current.ghost.label}</Link>
            </div>
            <div className="flex gap-2 mt-8">
              {slides.map((_, i) => (
                <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)}
                  className={cn('rounded-full transition-all', i === slide ? 'w-6 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60')} />
              ))}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {[
              { value: '10M+', label: 'Products listed' },
              { value: '5,000+', label: 'Verified sellers' },
              { value: '44', label: 'Regions served' },
              { value: '4.9\u2605', label: 'App store rating' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5 text-center">
                <p className="text-3xl font-extrabold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-white/60 font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {dealTicker.length > 0 && (
        <div className="relative bg-black/30 backdrop-blur-sm border-t border-white/10 py-2 overflow-hidden">
          <div className="flex whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
            {[...dealTicker, ...dealTicker].map((item, i) => (
              <Link key={i} href={item.href} className="inline-flex items-center gap-3 px-6 text-xs font-bold text-white/80 hover:text-white transition-colors shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
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

const CATEGORY_IMAGES = [
  { name: 'Mobiles', slug: 'mobiles', image: '/banners/category/top-cat-hp-mobile.png' },
  { name: 'Laptops', slug: 'computers', image: '/banners/category/top-cat-hp-laptops.png' },
  { name: 'Televisions', slug: 'tvs', image: '/banners/category/top-cat-hp-televisions.png' },
  { name: 'Gaming', slug: 'gaming', image: '/banners/category/top-cat-hp-console-gaming.png' },
  { name: 'Games', slug: 'games', image: '/banners/category/top-cat-hp-console-games.png' },
  { name: 'Cameras', slug: 'camera', image: '/banners/category/top-cat-hp-camera.png' },
  { name: 'Washing', slug: 'washing-machines', image: '/banners/category/top-cat-hp-washing-machine.png' },
  { name: 'Fridges', slug: 'refrigeration', image: '/banners/category/top-cat-hp-refrigeration.png' },
  { name: 'Beauty', slug: 'beauty', image: '/banners/category/top-cat-hp-health-beauty.png' },
  { name: 'Kitchen', slug: 'kitchen', image: '/banners/category/top-cat-hp-drinks-treat-makers.png' },
  { name: 'E-Mobility', slug: 'mobility', image: '/banners/category/top-cat-hp-e-mobility.png' },
  { name: 'Sports', slug: 'sports', image: '/banners/category/top-cat-hp-sports-fitness.png' },
] as const;

export interface QuickNavItem { name: string; slug: string; icon?: string; }

export function CategoryQuickNav() {
  const scroller = useRef<HTMLUListElement>(null);
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
            {CATEGORY_IMAGES.map(cat => (
              <li key={cat.slug} className="snap-start shrink-0">
                <Link href={`/products?category=${cat.slug}`} aria-label={cat.name} className="group block w-[96px] md:w-[112px] text-center">
                  <span className="relative block w-[96px] h-[96px] md:w-[112px] md:h-[112px] rounded-full overflow-hidden border-2 border-border bg-surface-sunken mx-auto mb-3 transition-all group-hover:border-ember group-hover:ring-2 group-hover:ring-ember/20 group-hover:shadow-lg">
                    <Image src={cat.image} alt="" fill sizes="112px" loading="lazy" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  </span>
                  <span className="block text-xs font-bold text-text-primary group-hover:text-ember transition-colors leading-tight">{cat.name}</span>
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
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-deal bg-deal/10 rounded-full px-2 py-0.5 tabular-nums mt-2" role="timer">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
      {time.hours}:{time.minutes}:{time.seconds}
    </span>
  );
}

function MidnightTimer() {
  const time = useMidnightCountdown();
  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Deals reset at midnight">
      {[time.hours, time.minutes, time.seconds].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="inline-flex flex-col items-center">
            <span className="text-lg font-extrabold text-ember tabular-nums leading-none">{v}</span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{['hr', 'min', 'sec'][i]}</span>
          </span>
          {i < 2 && <span className="text-ember font-extrabold text-lg leading-none mb-3">:</span>}
        </span>
      ))}
    </div>
  );
}

export function DealsOfTheDay({ deals }: { deals: DealCardData[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  if (deals.length === 0) return null;
  return (
    <section className="border-b border-border border-t-4 border-t-ember bg-surface" aria-label="Deals of the day">
      <div className="container-fluid py-10 md:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">&#9889;</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Deals of the Day</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Ends in</span>
              <MidnightTimer />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => snapScroll(scroller.current, -1)} aria-label="Scroll deals left" className="w-10 h-10 grid place-items-center rounded-full bg-surface-sunken border border-border shadow-sm hover:border-ember hover:text-ember transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button type="button" onClick={() => snapScroll(scroller.current, 1)} aria-label="Scroll deals right" className="w-10 h-10 grid place-items-center rounded-full bg-surface-sunken border border-border shadow-sm hover:border-ember hover:text-ember transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
            <Link href="/deals" className="text-sm font-bold text-ember hover:underline underline-offset-4 hidden md:inline-flex items-center gap-1">
              View all deals <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        </header>
        <ul ref={scroller} className="flex gap-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0" role="list">
          {deals.map(deal => {
            const saving = (deal.listPriceMinorUnits ?? 0) > deal.priceMinorUnits ? (deal.listPriceMinorUnits! - deal.priceMinorUnits) : 0;
            const savePct = deal.listPriceMinorUnits && saving > 0 ? Math.round((saving / deal.listPriceMinorUnits) * 100) : 0;
            const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(n / 100);
            return (
              <li key={deal.id} className="snap-start shrink-0 w-[68%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={deal.slug ? `/products/${deal.slug}` : deal.productId ? `/products/${deal.productId}` : '/deals'}
                  className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-ember transition-all h-full flex flex-col" suppressHydrationWarning>
                  <div className="relative aspect-[4/3] bg-surface-sunken shrink-0 overflow-hidden">
                    {deal.image && <Image src={storefrontImage(deal.image) || '/product-placeholder.svg'} alt="" fill sizes="300px" loading="lazy" className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />}
                    {savePct > 0 && <span className="absolute top-2 right-2 bg-deal text-white text-xs font-extrabold px-2 py-1 rounded-full shadow">-{savePct}%</span>}
                    <span className="absolute top-2 left-2 bg-ember text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">{deal.dealLabel}</span>
                  </div>
                  <div className="flex-1 flex flex-col p-4">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-ember transition-colors mb-3 line-clamp-2 leading-snug">{deal.productName}</p>
                    <div className="mt-auto">
                      <span className="block text-xl font-extrabold text-text-primary" suppressHydrationWarning>{fmt(deal.priceMinorUnits)}</span>
                      {saving > 0 && deal.listPriceMinorUnits && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-text-tertiary line-through" suppressHydrationWarning>{fmt(deal.listPriceMinorUnits)}</span>
                          <span className="text-xs text-deal font-bold" suppressHydrationWarning>Save {fmt(saving)}</span>
                        </div>
                      )}
                      <DealCountdown endsAt={deal.endsAt} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
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
    <section className="bg-surface-sunken border-b border-border py-12 md:py-16" aria-labelledby="trending-heading">
      <div className="container-fluid">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-ember uppercase tracking-widest mb-1">Updated daily from our top vendors</p>
            <h2 id="trending-heading" className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">What&apos;s Trending Right Now</h2>
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

// ─── §7 PromoBanner3Up ───────────────────────────────────────────────────────

interface PromoBannerItem { eyebrow: string; title: string; cta: string; href: string; bg: string; image?: string; }

const DEFAULT_PROMO_BANNERS: PromoBannerItem[] = [
  { eyebrow: 'From £399', title: 'Laptops & Computers', cta: 'Shop laptops', href: '/products?category=computers', bg: 'from-slate-900 to-slate-800', image: '/banners/category/top-cat-hp-laptops.png' },
  { eyebrow: 'New collection', title: 'Smart Home Essentials', cta: 'Explore smart home', href: '/products?category=smart-home', bg: 'from-ember-deep to-ember', image: '/banners/category/top-cat-hp-televisions.png' },
  { eyebrow: 'Trending now', title: 'Fashion & Style Picks', cta: 'Browse fashion', href: '/products?category=fashion', bg: 'from-red-900 to-red-800', image: '/banners/category/top-cat-hp-health-beauty.png' },
];

export function PromoBanner3Up({ banners = DEFAULT_PROMO_BANNERS }: { banners?: PromoBannerItem[] }) {
  return (
    <section aria-label="Featured categories" className="bg-surface border-b border-border">
      <div className="container-fluid py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map(banner => (
            <Link key={banner.href} href={banner.href} className="group relative overflow-hidden rounded-2xl min-h-[200px] md:min-h-[240px] flex flex-col justify-end p-6">
              <div className={`absolute inset-0 bg-gradient-to-br ${banner.bg}`} />
              {banner.image && <div className="absolute inset-0"><Image src={banner.image} alt="" fill sizes="33vw" className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10">
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">{banner.eyebrow}</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-white mb-4 leading-tight">{banner.title}</h3>
                <span className="inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-white text-ember text-xs font-extrabold shadow-lg group-hover:bg-white/90 transition-all">
                  {banner.cta} <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </span>
              </div>
            </Link>
          ))}
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
      <div className="container-fluid py-10 md:py-16">
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

// ─── §9 RecommendedForYou ────────────────────────────────────────────────────

export function RecommendedForYou({ products }: { products: ProductCardData[] }) {
  if (!products?.length) return null;
  return (
    <section className="py-12 md:py-16 border-b border-border bg-surface" aria-labelledby="reco-heading">
      <div className="container-fluid">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-ember uppercase tracking-widest mb-1">Picked for you</p>
            <h2 id="reco-heading" className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Recommended for you</h2>
          </div>
          <Link href="/products" className="text-sm font-bold text-ember hover:underline underline-offset-4 hidden sm:inline-flex items-center gap-1">
            Browse all <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
        <TrendingSlider>
          {products.map(product => <ProductCard key={product.id} product={{ ...product, vendor: product.vendor ?? undefined }} />)}
        </TrendingSlider>
      </div>
    </section>
  );
}

// ─── §10 AppDownloadBanner ───────────────────────────────────────────────────

export function AppDownloadBanner() {
  return (
    <section className="py-12 md:py-20 border-b border-border bg-surface-sunken" aria-labelledby="app-heading">
      <div className="container-fluid">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-midnight via-ember-deep to-ember text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between px-8 md:px-16 py-[53px] lg:py-[5px] gap-10">
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full blur-3xl bg-white/10" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full blur-2xl bg-white/5" />
          <div className="relative z-10 lg:py-16 max-w-lg text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-5">
              <span className="flex">{[0,1,2,3,4].map(i => <svg key={i} className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}</span>
              <span className="text-sm font-semibold text-white/60">4.9 · 50,000+ reviews</span>
            </div>
            <h2 id="app-heading" className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight text-white">Get the Storegrill App</h2>
            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">Shop faster, track orders in real-time, and unlock exclusive mobile-only deals. Available free on iOS and Android.</p>
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
      <div className="container-fluid py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-ember uppercase tracking-widest mb-1">Curated marketplace</p>
            <h2 id="vendor-spotlight-heading" className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Meet Our Top Sellers</h2>
          </div>
          <Link href="/vendor/apply" className="h-10 px-5 rounded-full border-2 border-ember text-ember text-sm font-bold hover:bg-ember hover:text-white transition-all inline-flex items-center gap-1.5">
            Become a seller <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {vendors.slice(0, 3).map(v => (
            <Link key={v.slug} href={`/vendors/${v.slug}`} className="group relative rounded-2xl bg-surface border border-border p-6 flex items-start gap-5 hover:border-ember hover:shadow-xl transition-all">
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-[success] bg-[success]/10">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                Trusted Seller
              </span>
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
    <section className="bg-surface-sunken border-t border-border py-10 md:py-14" aria-label="Shopping trust signals">
      <div className="container-fluid">
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
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-[success]/10">
                <svg className="w-5 h-5 text-[success]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg className="w-6 h-6 shrink-0 text-[success]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <section className="border-b border-border py-12 md:py-16 bg-surface" aria-labelledby="testimonials-heading">
      <div className="container-fluid">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-ember uppercase tracking-widest mb-2">Real customers, real reviews</p>
          <h2 id="testimonials-heading" className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">What Our Customers Say</h2>
        </div>
        <Swiper modules={[Autoplay, Pagination]} spaceBetween={20} slidesPerView={1}
          breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          autoplay={{ delay: 5000, disableOnInteraction: false }} pagination={{ clickable: true }}
          onSwiper={swiper => { sliderRef.current = swiper; }} className="pb-10">
          {items.map((t, i) => (
            <SwiperSlide key={i} className="h-auto">
              <div className="bg-surface border border-border rounded-2xl p-6 h-full flex flex-col shadow-sm hover:shadow-md hover:border-ember/30 transition-all">
                <span className="text-5xl font-extrabold leading-none mb-2 -mt-2" style={{ color: 'rgba(76,18,161,0.2)' }} aria-hidden="true">&ldquo;</span>
                <div className="flex items-center gap-0.5 mb-4">
                  {[0,1,2,3,4].map(j => <svg key={j} className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed flex-grow">{t.quote}</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                  <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-full border border-border" />
                  <div><p className="text-sm font-bold text-text-primary">{t.name}</p><p className="text-xs text-text-tertiary">{t.role}</p></div>
                  <span className="ml-auto inline-flex items-center text-[10px] font-bold gap-1 text-[success]">
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

interface ViewedItem { slug: string; name: string; unitPriceMinorUnits: number; currencyCode: string; thumbnail?: string; }
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

// ─── Preserved: PromoSlider, FeaturedCollections ──────────────────────────────

export interface PromoTile { src: string; label: string; href: string; }
export interface PromoSliderProps { id: string; heading: string; subtitle?: string; background?: string; tiles: PromoTile[]; }

export function PromoSlider({ id, heading, subtitle, background = 'var(--color-surface)', tiles }: PromoSliderProps) {
  const scroller = useRef<HTMLUListElement>(null);
  return (
    <section aria-labelledby={`${id}-heading`} className="border-b border-border py-8 md:py-12" style={{ background }}>
      <div className="container-fluid">
        <div className="mb-6 text-center">
          <h2 id={`${id}-heading`} className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">{heading}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        <div className="relative group/slider">
          <ul ref={scroller} data-testid={`${id}-scroller`} className="flex gap-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0" role="list">
            {tiles.map(tile => (
              <li key={tile.src} className="w-full shrink-0 snap-start sm:w-[calc(25%-12px)]">
                <Link href={tile.href} aria-label={tile.label} className="group block overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <span className="relative block aspect-[510/440] bg-surface-sunken overflow-hidden">
                    <Image src={tile.src} alt="" fill sizes="25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </span>
                  <span className="flex items-center justify-center min-h-[56px] bg-surface px-4 py-3 text-center text-sm font-bold text-text-primary group-hover:text-ember transition-colors">{tile.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <NavBtn dir={-1} label={`Previous ${id}`} onClick={() => snapScroll(scroller.current, -1)} />
          <NavBtn dir={1} label={`Next ${id}`} onClick={() => snapScroll(scroller.current, 1)} />
        </div>
      </div>
    </section>
  );
}

export interface FeaturedCollection { icon: string; title: string; subtitle: string; aspect?: string; tiles: PromoTile[]; }

export function FeaturedCollections({ collections }: { collections: FeaturedCollection[] }) {
  return (
    <section aria-labelledby="featured-collections-heading" className="border-b border-border py-10 md:py-12">
      <div className="container-fluid">
        <h2 id="featured-collections-heading" className="text-2xl md:text-3xl font-extrabold text-text-primary mb-6 tracking-tight">Featured collections</h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {collections.map(col => (
            <div key={col.title} className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <div className="flex items-center gap-5 mb-8">
                <span className="w-16 h-16 rounded-full grid place-items-center shrink-0 bg-ember/10">
                  <Image src={col.icon} alt="" width={38} height={38} className="rounded-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-text-primary leading-tight mb-1">{col.title}</h3>
                  <p className="text-sm text-text-secondary leading-snug">{col.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {col.tiles.map(tile => (
                  <Link key={tile.src} href={tile.href} aria-label={tile.label} className="group block overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember">
                    <span className={`relative block ${col.aspect ?? 'aspect-[3/2]'} bg-surface-sunken overflow-hidden`}>
                      <Image src={tile.src} alt="" fill sizes="22vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </span>
                    <span className="flex items-center min-h-[64px] bg-surface px-4 py-3 text-sm font-bold text-text-primary group-hover:text-ember transition-colors">{tile.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
