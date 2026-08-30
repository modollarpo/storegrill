'use client';

import Link from 'next/link';
import { Children, useEffect, useRef, useState, useCallback } from 'react';
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

export interface QuickNavItem {
  name: string;
  slug: string;
  icon?: string;
}

export function TrendingSlider({ children }: { children: React.ReactNode[] }) {
  const scroller = useRef<HTMLUListElement>(null);

  function step(dir: 1 | -1) {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stopOf = (node: HTMLElement) => Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.abs(stopOf(node) - el.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    let next = (best + dir + nodes.length) % nodes.length;
    let guard = 0;
    while (next !== best && Math.abs(stopOf(nodes[next]) - stopOf(nodes[best])) < 4 && guard++ < nodes.length) {
      next = (next + dir + nodes.length) % nodes.length;
    }
    el.scrollTo({ left: stopOf(nodes[next]), behavior: 'smooth' });
  }

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
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous popular products"
        className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next popular products"
        className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
    </div>
  );
}

export interface TabbedProductTab {
  label: string;
  products: React.ReactNode[];
}

export function TabbedProductCarousel({ tabs }: { tabs: TabbedProductTab[] }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLUListElement>(null);

  function step(dir: 1 | -1) {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stopOf = (node: HTMLElement) => Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.abs(stopOf(node) - el.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    let next = (best + dir + nodes.length) % nodes.length;
    let guard = 0;
    while (next !== best && Math.abs(stopOf(nodes[next]) - stopOf(nodes[best])) < 4 && guard++ < nodes.length) {
      next = (best + dir + nodes.length) % nodes.length;
    }
    el.scrollTo({ left: stopOf(nodes[next]), behavior: 'smooth' });
  }

  const activeProducts = tabs[active]?.products ?? [];

  return (
    <div>
      {/* Tabs - Bevesi style: centered, border-bottom */}
      <div className="flex flex-wrap justify-center gap-0 border-b border-border mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'px-5 py-3 text-sm font-bold border-b-2 transition-colors',
              i === active
                ? 'border-ember text-ember'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div className="relative group/slider">
        <ul
          ref={scroller}
          className="flex gap-6 px-0 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-0"
        >
          {activeProducts.map((child, i) => (
            <li key={i} className="w-[75%] sm:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0 snap-start">
              {child}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous"
          className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </div>
  );
}

export interface FeaturedCollection {
  icon: string;
  title: string;
  subtitle: string;
  aspect?: string;
  tiles: PromoTile[];
}

export function FeaturedCollections({ collections }: { collections: FeaturedCollection[] }) {
  return (
    <section aria-labelledby="featured-collections-heading" className="border-b border-border py-10 md:py-12">
      <div className="container-fluid">
        <h2 id="featured-collections-heading" className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
          Featured collections
        </h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {collections.map(col => (
            <div key={col.title} className="rounded-xs border border-border bg-surface p-6 md:p-8">
              <div className="flex items-center gap-5 mb-8">
                <span className="w-16 h-16 rounded-full grid place-items-center shrink-0 bg-ember-pale">
                  <Image src={col.icon} alt="" width={38} height={38} className="rounded-full relative z-10" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-text-primary leading-tight mb-1">{col.title}</h3>
                  <p className="text-sm text-text-secondary leading-snug">{col.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {col.tiles.map(tile => (
                  <Link
                    key={tile.src}
                    href={tile.href}
                    aria-label={tile.label}
                    className="group block overflow-hidden rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember"
                  >
                    <span className={`relative block ${col.aspect ?? 'aspect-[3/2]'} bg-surface-sunken overflow-hidden`}>
                      <Image
                        src={tile.src}
                        alt=""
                        fill
                        sizes="(max-width:768px) 44vw, 22vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </span>
                    <span className="flex items-center min-h-[64px] bg-surface px-4 py-3 text-sm font-bold leading-snug text-text-primary group-hover:text-ember transition-colors">
                      {tile.label}
                    </span>
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

export interface PromoTile {
  src: string;
  label: string;
  href: string;
}

export interface PromoSliderProps {
  id: string;
  heading: string;
  subtitle?: string;
  background?: string;
  tiles: PromoTile[];
}

export function PromoSlider({ id, heading, subtitle, background = 'var(--color-surface)', tiles }: PromoSliderProps) {
  const scroller = useRef<HTMLUListElement>(null);

  function scrollTiles(dir: 1 | -1) {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stops: number[] = [];
    for (const node of Array.from(el.children) as HTMLElement[]) {
      const target = Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
      if (stops.length === 0 || target > stops[stops.length - 1] + 4) stops.push(target);
    }
    const currentIndex = stops.reduce(
      (best, s, i) => (Math.abs(s - el.scrollLeft) < Math.abs(stops[best] - el.scrollLeft) ? i : best),
      0
    );
    const nextIndex = (currentIndex + dir + stops.length) % stops.length;
    el.scrollTo({ left: stops[nextIndex], behavior: 'smooth' });
  }

  return (
    <section
      aria-labelledby={`${id}-spotlight-heading`}
className="border-b border-border py-8 md:py-12"
      style={{ background }}
    >
      <div className="container-fluid">
        <div className="mb-6 text-center">
          <h2 id={`${id}-spotlight-heading`} className="text-2xl md:text-3xl font-bold text-text-primary">
            {heading}
          </h2>
          {subtitle && (
            <p className="mt-1 text-body-md text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>
        <div className="relative group/slider">
          <ul
            ref={scroller}
            data-testid={`${id}-scroller`}
            className="flex gap-4 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6 md:gap-4 md:scroll-pl-6 lg:gap-4 lg:scroll-pl-6"
          >
            {tiles.map(tile => (
<li
                key={tile.src}
                className="w-full shrink-0 snap-start sm:w-[calc(25%-12px)] md:w-[calc(25%-12px)] lg:w-[calc(25%-12px)]"
              >
                <Link
                  href={tile.href}
                  aria-label={tile.label}
                  className="group block overflow-hidden rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="relative block aspect-[510/440] bg-surface-sunken overflow-hidden">
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      sizes="(max-width:640px) 88vw, (max-width:768px) 44vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                  <span className="flex items-center justify-center min-h-[56px] bg-surface px-4 py-3 text-center text-sm font-bold leading-snug text-text-primary group-hover:text-ember transition-colors">
                    {tile.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => scrollTiles(-1)}
            aria-label={`Previous ${id} offers`}
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => scrollTiles(1)}
            aria-label={`Next ${id} offers`}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

export function CampaignHero() {
  const hero = regionPromoContent('US');

  return (
    <section aria-label="Featured deals" className="bg-surface border-b border-border">
      <div className="container-fluid py-6 md:py-10">
        <div className="relative overflow-hidden rounded-lg bg-ember-deep text-white">
          {hero.heroImage && (
            <div className="absolute inset-0">
              <Image
                src={hero.heroImage}
                alt=""
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover opacity-30"
              />
            </div>
          )}
          <div className="relative container-fluid py-10 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3">
                {hero.heroHeadline}
              </h1>
              <p className="text-base md:text-lg text-white/80 mb-6 max-w-lg">
                {hero.heroSubtitle}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center rounded-xs bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold">
                  {hero.couponCode} · {hero.couponDiscountPercent}% off
                </span>
                <span className="inline-flex items-center rounded-xs bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold">
                  {hero.cashbackPercent}% cashback
                </span>
              </div>
            </div>
            <a
              href="/deals"
              className="inline-flex shrink-0 items-center justify-center h-[48px] px-8 rounded-xs bg-white text-ember-deep font-bold text-sm shadow-lg hover:bg-white/90 transition-colors"
            >
              {hero.heroCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const CATEGORY_IMAGES = [
  { name: 'Mobiles', slug: 'mobiles', image: '/banners/category/top-cat-hp-mobile.png' },
  { name: 'Laptops', slug: 'computers', image: '/banners/category/top-cat-hp-laptops.png' },
  { name: 'Televisions', slug: 'tvs', image: '/banners/category/top-cat-hp-televisions.png' },
  { name: 'Console Gaming', slug: 'gaming', image: '/banners/category/top-cat-hp-console-gaming.png' },
  { name: 'Console Games', slug: 'games', image: '/banners/category/top-cat-hp-console-games.png' },
  { name: 'Camera', slug: 'camera', image: '/banners/category/top-cat-hp-camera.png' },
  { name: 'Washing Machines', slug: 'washing-machines', image: '/banners/category/top-cat-hp-washing-machine.png' },
  { name: 'Refrigeration', slug: 'refrigeration', image: '/banners/category/top-cat-hp-refrigeration.png' },
  { name: 'Health & Beauty', slug: 'beauty', image: '/banners/category/top-cat-hp-health-beauty.png' },
  { name: 'Drinks & Treat Makers', slug: 'kitchen', image: '/banners/category/top-cat-hp-drinks-treat-makers.png' },
  { name: 'E-Mobility', slug: 'mobility', image: '/banners/category/top-cat-hp-e-mobility.png' },
  { name: 'Sports & Fitness', slug: 'sports', image: '/banners/category/top-cat-hp-sports-fitness.png' },
] as const;

export function CategoryQuickNav() {
  const scroller = useRef<HTMLUListElement>(null);

  function step(dir: 1 | -1) {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stopOf = (node: HTMLElement) => Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.abs(stopOf(node) - el.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    let next = (best + dir + nodes.length) % nodes.length;
    let guard = 0;
    while (next !== best && Math.abs(stopOf(nodes[next]) - stopOf(nodes[best])) < 4 && guard++ < nodes.length) {
      next = (next + dir + nodes.length) % nodes.length;
    }
    el.scrollTo({ left: stopOf(nodes[next]), behavior: 'smooth' });
  }

  return (
    <nav aria-label="Shop by category" className="border-b border-border">
      <div className="py-10 md:py-12">
        <div className="relative group/cat">
          <ul
            ref={scroller}
            className="flex gap-5 md:gap-6 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6"
            role="list"
          >
            {CATEGORY_IMAGES.map(cat => (
              <li key={cat.slug} className="snap-start shrink-0">
                <Link
                  href={`/products?category=${cat.slug}`}
                  aria-label={cat.name}
                  className="group block w-[120px] md:w-[140px] text-center"
                >
                  <span className="relative block w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border border-border bg-surface-sunken mx-auto mb-2 transition-all group-hover:border-ember group-hover:shadow-md">
                    <Image
                      src={cat.image}
                      alt=""
                      fill
                      sizes="140px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                  <span className="block text-xs md:text-sm font-bold text-text-primary group-hover:text-ember transition-colors leading-tight">
                    {cat.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous categories"
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next categories"
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
      </div>
      </div>
    </nav>
  );
}

export interface CategoryBannerWithProductsProps {
  title: string;
  subtitle?: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  bannerImage: string;
  bannerBg: string;
  products: ProductCardData[];
}

export function CategoryBannerWithProducts({ title, subtitle, description, ctaLabel, ctaHref, bannerImage, bannerBg, products }: CategoryBannerWithProductsProps) {
  return (
    <section className="border-b border-border">
      <div className="container-fluid py-8 md:py-10">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6 md:gap-8">
          <Link href={ctaHref} className="group block relative overflow-hidden rounded-xs min-h-[280px] lg:min-h-0" style={{ backgroundColor: bannerBg }}>
            <Image src={bannerImage} alt={title} fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
              {subtitle && <span className="text-sm font-medium mb-1">{subtitle}</span>}
              <span className="text-xl md:text-2xl font-bold tracking-tight leading-tight max-w-[85%]">{title}</span>
              {description && <span className="text-sm mt-2 max-w-xs opacity-90">{description}</span>}
              <span className="inline-flex w-fit items-center mt-4 px-5 py-2.5 bg-surface text-text-primary text-sm font-semibold rounded-xs shadow-md group-hover:bg-charcoal group-hover:text-white transition-all">
                {ctaLabel}
              </span>
            </span>
          </Link>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={{ ...product, vendor: product.vendor ?? undefined }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

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

function useCountdown(endsAt?: string): { hours: string; minutes: string; seconds: string } | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();
    function tick() {
      setRemaining(Math.max(0, target - Date.now()));
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining === null) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    hours: String(Math.floor(totalSeconds / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  };
}

function Countdown({ endsAt }: { endsAt?: string }) {
  const time = useCountdown(endsAt);
  if (!time) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-ember rounded-xs px-2 py-1 tabular-nums mt-2" role="timer" aria-label={`Deal ends in ${time.hours} hours ${time.minutes} minutes`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      {time.hours}:{time.minutes}:{time.seconds}
    </span>
  );
}

export function DealsOfTheDay({ deals }: { deals: DealCardData[] }) {
  const scroller = useRef<HTMLUListElement>(null);

  function scroll(dir: 1 | -1) {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stopOf = (node: HTMLElement) => Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.abs(stopOf(node) - el.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    let next = (best + dir + nodes.length) % nodes.length;
    let guard = 0;
    while (next !== best && Math.abs(stopOf(nodes[next]) - stopOf(nodes[best])) < 4 && guard++ < nodes.length) {
      next = (next + dir + nodes.length) % nodes.length;
    }
    el.scrollTo({ left: stopOf(nodes[next]), behavior: 'smooth' });
  }

  if (deals.length === 0) return null;

  return (
    <section className="border-b border-border py-10 md:py-12" aria-label="Deals of the day">
      <div className="container-fluid">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Deals Of The Day</h2>
          <div className="hidden sm:flex gap-3">
            <button type="button" onClick={() => scroll(-1)} aria-label="Scroll deals left" className="w-10 h-10 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-ember hover:text-ember transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Scroll deals right" className="w-10 h-10 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-ember hover:text-ember transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </header>
        <ul ref={scroller} className="flex gap-4 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6" role="list">
          {deals.map(deal => {
            const savingMinorUnits = deal.listPriceMinorUnits && deal.listPriceMinorUnits > deal.priceMinorUnits ? deal.listPriceMinorUnits - deal.priceMinorUnits : 0;
            return (
              <li key={deal.id} className="snap-start shrink-0 w-[75%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={deal.productId ? `/products/${deal.productId}` : '/deals'} className="group block bg-surface border border-border rounded-lg p-4 hover:shadow-md hover:border-ember transition-all h-full flex flex-col" suppressHydrationWarning>
                  <div className="relative w-full aspect-square bg-surface mb-3 shrink-0 rounded-md overflow-hidden">
                    {deal.image && (
                      <Image src={storefrontImage(deal.image) || '/product-placeholder.svg'} alt="" fill sizes="240px" className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <span className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-sm bg-ember text-white text-[11px] font-bold px-2 py-1 uppercase tracking-wider">{deal.dealLabel}</span>
                    </span>
                  </div>
                  <p className="text-sm font-bold line-clamp-2 leading-snug text-text-primary group-hover:text-ember transition-colors mb-3">{deal.productName}</p>
                  
                  <div className="mt-auto">
                    <span className="block text-xl font-extrabold text-text-primary" suppressHydrationWarning>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(deal.priceMinorUnits / 100)}
                    </span>
                    {savingMinorUnits > 0 && deal.listPriceMinorUnits && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary line-through" suppressHydrationWarning>
                          Was {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(deal.listPriceMinorUnits / 100)}
                        </span>
                        <span className="text-xs text-ember font-bold bg-ember/10 px-1.5 py-0.5 rounded-sm" suppressHydrationWarning>
                          Save {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(savingMinorUnits / 100)}
                        </span>
                      </div>
                    )}
                    <Countdown endsAt={deal.endsAt} />
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

const TRUST_ITEMS = [
  {
    title: 'Free Shipping',
    body: 'Free shipping on order over $50',
    iconPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  },
  {
    title: 'Money Back',
    body: '30 days money back guarantee',
    iconPath: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  },
  {
    title: 'Next Day Delivery',
    body: 'Next day delivery free – spend over $99',
    iconPath: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  },
  {
    title: 'Free Returns',
    body: '60-Day free returns, All shipping method',
    iconPath: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  },
];

export function TrustBar({ freeShippingThreshold, currency }: { freeShippingThreshold: number; currency: string }) {
  const formattedThreshold = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(freeShippingThreshold / 100);

  const items = [
    { ...TRUST_ITEMS[0], body: `Free shipping on order over ${formattedThreshold}` },
    TRUST_ITEMS[1],
    { ...TRUST_ITEMS[2], body: `Next day delivery free – spend over ${formattedThreshold}` },
    TRUST_ITEMS[3],
  ];

  return (
    <section aria-label="Why shop with Storegrill" className="bg-ember-pale border-b border-border">
      <div className="container-fluid py-1.5 md:py-2">
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-0.5 md:gap-1" role="list">
        {items.map(item => (
          <li key={item.title} className="flex items-center gap-2 py-1">
            <span aria-hidden="true" className="w-8 h-8 shrink-0 grid place-items-center rounded-xs text-ember-deep">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
              </svg>
            </span>
            <p className="text-[15px] text-ember-deep leading-tight">{item.body}</p>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

interface ViewedItem {
  slug: string;
  name: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
  thumbnail?: string;
}

const RECENTLY_VIEWED_KEY = 'storegrill-recently-viewed';

export function RecentlyViewed() {
  const [items, setItems] = useState<ViewedItem[]>([]);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    function load() {
      try {
        setItems(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]').slice(0, 8));
      } catch {
        setItems([]);
      }
    }
    load();
    window.addEventListener('storegrill:recently-viewed', load);
    return () => window.removeEventListener('storegrill:recently-viewed', load);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth - el.clientWidth > 120);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items.length]);

  function step(dir: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    if (nodes.length === 0) return;
    const max = el.scrollWidth - el.clientWidth;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const stopOf = (node: HTMLElement) => Math.min(max, Math.max(0, Math.round(node.offsetLeft - pad)));
    let best = 0;
    let bestDist = Infinity;
    nodes.forEach((node, i) => {
      const d = Math.abs(stopOf(node) - el.scrollLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const target = Math.min(nodes.length - 1, Math.max(0, best + dir));
    el.scrollTo({ left: stopOf(nodes[target]), behavior: 'smooth' });
  }

  if (items.length === 0) return null;

  return (
    <section className="border-b border-border" aria-label="Pick up where you left off">
      <div className="container-fluid py-10 md:py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">Pick up where you left off</h2>
        <div className="relative group/recent">
          <ul
            ref={scrollerRef}
            data-testid="recent-scroller"
            className="flex gap-5 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6"
            role="list"
          >
            {items.map(item => (
              <li key={item.slug} className="snap-start shrink-0 w-[75%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={`/products/${item.slug}`} className="group flex h-full flex-col rounded-xs border border-border bg-surface overflow-hidden hover:border-ember hover:shadow-md transition-all">
                  <span className="relative block aspect-square bg-surface-sunken overflow-hidden">
                    {item.thumbnail && (
                      <Image
                        src={storefrontImage(item.thumbnail) || '/product-placeholder.svg'}
                        alt=""
                        fill
                        sizes="(max-width:640px) 160px, 240px"
                        className="object-contain p-3 transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
                      />
                    )}
                  </span>
                  <span className="flex flex-col p-4 grow">
                    <span className="text-sm font-medium leading-snug text-text-primary line-clamp-2 min-h-[2.5rem] group-hover:text-ember transition-colors">{item.name}</span>
                    <span className="text-base font-bold mt-2">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currencyCode }).format(item.unitPriceMinorUnits / 100)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {scrollable && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous recently viewed items"
                className="absolute left-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next recently viewed items"
                className="absolute right-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export interface VendorSpotlightItem {
  storeName: string;
  slug: string;
  rating: number;
  reviewCount: number;
  logo?: string;
  description?: string;
}

export function VendorSpotlight({ vendors }: { vendors: VendorSpotlightItem[] }) {
  if (vendors.length === 0) return null;
  return (
    <section className="border-b border-border" aria-labelledby="vendor-spotlight-heading">
      <div className="container-fluid py-10 md:py-12">
      <div className="flex items-end justify-between mb-6">
        <h2 id="vendor-spotlight-heading" className="text-2xl md:text-3xl font-bold text-text-primary">Featured Vendors</h2>
        <Link href="/vendors" className="text-sm font-bold text-ember hover:underline underline-offset-4">All vendors</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {vendors.slice(0, 3).map(v => (
          <Link key={v.slug} href={`/vendors/${v.slug}`} className="rounded-xs bg-surface border border-border p-4 flex items-center gap-5 hover:border-ember transition-colors group">
            <span className="w-16 h-16 rounded-full bg-gradient-to-br from-ember to-ember-dark text-white grid place-items-center font-bold text-lg shrink-0 overflow-hidden">
              {v.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                v.storeName.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-text-primary group-hover:text-ember transition-colors truncate">{v.storeName}</span>
              <span className="block text-xs font-medium text-text-secondary mt-1">
                ★ {v.rating > 0 ? v.rating.toFixed(1) : 'New'} · {v.reviewCount.toLocaleString()} reviews
              </span>
            </span>
            <span className="shrink-0 text-text-tertiary group-hover:text-ember transition-colors">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </span>
          </Link>
        ))}
      </div>
      </div>
    </section>
  );
}

export interface TestimonialItem {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}

export function Testimonials({ items = [] }: { items?: TestimonialItem[] }) {
  const [isClient, setIsClient] = useState(false);
  const sliderRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (items.length === 0 || !isClient) return null;

  return (
    <section className="border-b border-border py-10 md:py-16 bg-surface-sunken">
      <div className="container-fluid">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-8 text-center">What Our Customers Say</h2>
        <div className="relative group/slider">
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            onSwiper={swiper => { sliderRef.current = swiper; }}
            className="px-2">
            {items.map((t, i) => (
              <SwiperSlide key={i} className="h-auto">
                <div className="bg-surface p-6 rounded-lg shadow-sm border border-border h-full flex flex-col">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Image key={j} src="/icons/icon-star.svg" alt="star" width={16} height={16} />
                    ))}
                  </div>
                  <p className="text-text-secondary mb-6 flex-grow">{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-full" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">{t.name}</p>
                      <p className="text-xs text-text-secondary">{t.role}</p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
