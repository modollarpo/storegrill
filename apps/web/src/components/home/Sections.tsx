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
import { ProductCard, type ProductCardData } from '@/components/commerce/ProductCard';
import { promoPalette } from '@/design-system/tokens';

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
        className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next popular products"
        className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
      <div className="flex flex-wrap justify-center gap-0 border-b border-gray-200 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'px-5 py-3 text-sm font-bold border-b-2 transition-colors',
              i === active
                ? 'border-ember text-ember'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-border-strong'
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
          className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
    <section aria-labelledby="featured-collections-heading" className="border-b border-gray-200 py-10 md:py-12">
      <div className="container-fluid">
        <h2 id="featured-collections-heading" className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Featured collections
        </h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {collections.map(col => (
            <div key={col.title} className="rounded-xs border border-gray-200 bg-white p-6 md:p-8">
              <div className="flex items-center gap-5 mb-8">
                <span className="w-16 h-16 rounded-full grid place-items-center shrink-0 bg-ember-pale">
                  <Image src={col.icon} alt="" width={38} height={38} className="rounded-full relative z-10" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">{col.title}</h3>
                  <p className="text-sm text-gray-500 leading-snug">{col.subtitle}</p>
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
                    <span className={`relative block ${col.aspect ?? 'aspect-[3/2]'} bg-gray-50 overflow-hidden`}>
                      <Image
                        src={tile.src}
                        alt=""
                        fill
                        sizes="(max-width:768px) 44vw, 22vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </span>
                    <span className="flex items-center min-h-[64px] bg-white px-4 py-3 text-sm font-bold leading-snug text-gray-900 group-hover:text-ember transition-colors">
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
className="border-b border-gray-200 py-8 md:py-12"
      style={{ background }}
    >
      <div className="container-fluid">
        <div className="mb-6 text-center">
          <h2 id={`${id}-spotlight-heading`} className="text-2xl md:text-3xl font-bold text-gray-900">
            {heading}
          </h2>
          {subtitle && (
            <p className="mt-1 text-body-md text-gray-500">
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
                  <span className="relative block aspect-[510/440] bg-gray-50 overflow-hidden">
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      sizes="(max-width:640px) 88vw, (max-width:768px) 44vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                  <span className="flex items-center justify-center min-h-[56px] bg-white px-4 py-3 text-center text-sm font-bold leading-snug text-gray-900 group-hover:text-ember transition-colors">
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
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => scrollTiles(1)}
            aria-label={`Next ${id} offers`}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

interface CampaignTile {
  href: string;
  title: string;
  subtitle?: string;
  description?: string;
  cta?: string;
  image: string;
  timer?: boolean;
  bgColor: string;
}

const CAMPAIGN_TILES = {
  main: {
    href: '/deals',
    title: 'Elevate Your Digital Lifestyle',
    subtitle: 'The Ideal Electronics.',
    description: 'We have prepared special discounts for you on the products you need. Don\'t miss these opportunities...',
    cta: 'Shop Now',
    image: '/banners/hero_campaign/banner-07.jpg',
    timer: true,
    bgColor: promoPalette.umber,
  },
  topLeft: {
    href: '/payments',
    title: 'We Will Take You Anywhere',
    subtitle: 'The Ideal Electronics.',
    image: '/banners/hero_campaign/banner-08.jpg',
    bgColor: promoPalette.plum,
  },
  topRight: {
    href: '/shipping',
    title: 'Micro Electrons Are What We Do',
    subtitle: 'Regular And Stabler.',
    image: '/banners/hero_campaign/banner-09.jpg',
    bgColor: promoPalette.plum,
  },
  bottom: {
    href: '/products',
    title: 'Tech Trends, Unleashed',
    subtitle: 'Order Of The Circuits',
    description: 'Discover the latest in tech. Shop new arrivals, exclusive deals, and more.',
    image: '/banners/hero_campaign/banner-10.jpg',
    bgColor: promoPalette.clay,
  },
} as const;

function CampaignCard({ tile, large, small }: { tile: CampaignTile; large?: boolean; small?: boolean }) {
  return (
    <Link
      href={tile.href}
      aria-label={tile.title}
      className={`group block relative overflow-hidden rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember ${small ? '' : 'h-full'}`}
    >
      <span className={`relative block overflow-hidden ${large ? 'aspect-[4/3] md:aspect-[3/2]' : small ? 'aspect-square' : 'h-full'}`} style={{ backgroundColor: tile.bgColor }}>
        <Image
          src={tile.image}
          alt={tile.title}
          fill
          sizes={large ? '(max-width:768px) 100vw, 880px' : '(max-width:768px) 50vw, 440px'}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority={large}
        />
      </span>
      <span className={`absolute inset-0 flex flex-col text-white ${large ? 'justify-between p-5 md:p-6 lg:p-8' : small ? 'items-center justify-start text-center pt-5 md:pt-6 lg:pt-8' : 'justify-center p-5 md:p-6 lg:p-8'}`}>
        <span className={`${large ? 'max-w-[60%]' : small ? 'max-w-full' : 'max-w-[55%]'}`}>
          {tile.subtitle && (
            <span className="block text-sm font-medium mb-2">{tile.subtitle}</span>
          )}
          {tile.title && (
            <span className={`block font-bold tracking-tight ${large ? 'text-[26px] md:text-4xl lg:text-5xl' : small ? 'text-xl md:text-xl lg:text-2xl' : 'text-[26px] md:text-[40px] lg:text-5xl/tight'}`}>{tile.title}</span>
          )}
          {tile.description && (
            <span className="block text-sm lg:text-base mt-2 max-w-sm">{tile.description}</span>
          )}
        </span>
        {tile.cta && (
          <span className={`inline-flex w-fit items-center rounded-xs bg-white px-[1.375rem] h-[44px] text-[14px] font-semibold text-gray-900 shadow-[0_0.125rem_0.1875rem_rgba(2,6,23,0.04)] transition-all ${large ? 'mt-4' : 'mt-3'}`}>
            {tile.cta}
          </span>
        )}
        {tile.timer && (
          <span className="mt-auto pt-4">
            <span className="block text-xs font-medium mb-1.5">Remaining Time:</span>
            <CountdownBanner />
          </span>
        )}
      </span>
    </Link>
  );
}

function CountdownBanner() {
  const [target] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 59, 0);
    return d.getTime();
  });
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(target - Date.now());
    const timer = setInterval(() => setRemaining(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (remaining === null) {
    return (
      <span className="inline-flex items-center bg-white rounded-xs gap-1">
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">--</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">--</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">--</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">--</span>
      </span>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = String(Math.floor(totalSeconds / 86400)).padStart(2, '0');
  const hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return (
    <span suppressHydrationWarning className="inline-flex items-center bg-white rounded-xs gap-1">
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">{days}</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">{hours}</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">{minutes}</span>
        <span className="text-gray-900/40 font-semibold">:</span>
        <span className="inline-flex items-center justify-center min-w-[2.375rem] py-1.5 text-[14px] font-bold tabular-nums text-gray-900">{seconds}</span>
    </span>
  );
}

export function CampaignHero() {
  const { main, topLeft, topRight, bottom } = CAMPAIGN_TILES;
  const sliderRef = useRef<SwiperType | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrev = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.slideNext();
  }, []);

  return (
    <section aria-label="Featured campaigns" className="bg-white border-b border-gray-200">
      <div className="p-4 md:p-5">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-4 md:gap-5 items-stretch">
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            {isClient ? (
              <Swiper
                modules={[Autoplay, Pagination]}
                spaceBetween={0}
                slidesPerView={1}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                onSwiper={swiper => { sliderRef.current = swiper; }}
                className="hero-carousel w-full"
              >
                {[main].map((tile, i) => (
                  <SwiperSlide key={i}>
                    <CampaignCard tile={tile} large />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="aspect-[4/3] md:aspect-[2.1/1]" />
            )}
            {/* Navigation arrows */}
            {isClient && (
              <>
                <button
                  onClick={handlePrev}
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-900 hover:bg-white transition-colors"
                >
                  <svg className="fill-current" width="20" height="20" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M15.4881 4.43057C15.8026 4.70014 15.839 5.17361 15.5694 5.48811L9.98781 12L15.5694 18.5119C15.839 18.8264 15.8026 19.2999 15.4881 19.5695C15.1736 19.839 14.7001 19.8026 14.4306 19.4881L8.43056 12.4881C8.18981 12.2072 8.18981 11.7928 8.43056 11.5119L14.4306 4.51192C14.7001 4.19743 15.1736 4.161 15.4881 4.43057Z" fill="" /></svg>
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-900 hover:bg-white transition-colors"
                >
                  <svg className="fill-current" width="20" height="20" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M8.51192 4.43057C8.82641 4.161 9.29989 4.19743 9.56946 4.51192L15.5695 11.5119C15.8102 11.7928 15.8102 12.2072 15.5695 12.4881L9.56946 19.4881C9.29989 19.8026 8.82641 19.839 8.51192 19.5695C8.19743 19.2999 8.161 18.8264 8.43057 18.5119L14.0122 12L8.43057 5.48811C8.161 5.17361 8.19743 4.70014 8.51192 4.43057Z" fill="" /></svg>
                </button>
              </>
            )}
          </div>
          <div className="grid grid-rows-[auto_1fr] gap-4 md:gap-5">
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              <CampaignCard tile={topLeft} small />
              <CampaignCard tile={topRight} small />
            </div>
            <CampaignCard tile={bottom} />
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
    <nav aria-label="Shop by category" className="border-b border-gray-200">
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
                  <span className="relative block w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border border-gray-200 bg-gray-50 mx-auto mb-2 transition-all group-hover:border-ember group-hover:shadow-md">
                    <Image
                      src={cat.image}
                      alt=""
                      fill
                      sizes="140px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                  <span className="block text-xs md:text-sm font-bold text-gray-900 group-hover:text-ember transition-colors leading-tight">
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
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next categories"
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/cat:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
    <section className="border-b border-gray-200">
      <div className="container-fluid py-8 md:py-10">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6 md:gap-8">
          <Link href={ctaHref} className="group block relative overflow-hidden rounded-xs min-h-[280px] lg:min-h-0" style={{ backgroundColor: bannerBg }}>
            <Image src={bannerImage} alt={title} fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
              {subtitle && <span className="text-sm font-medium mb-1">{subtitle}</span>}
              <span className="text-xl md:text-2xl font-bold tracking-tight leading-tight max-w-[85%]">{title}</span>
              {description && <span className="text-sm mt-2 max-w-xs opacity-90">{description}</span>}
              <span className="inline-flex w-fit items-center mt-4 px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xs shadow-md group-hover:bg-charcoal group-hover:text-white transition-all">
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
    <section className="border-b border-gray-200 py-10 md:py-12" aria-label="Deals of the day">
      <div className="container-fluid">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Deals Of The Day</h2>
          <div className="hidden sm:flex gap-3">
            <button type="button" onClick={() => scroll(-1)} aria-label="Scroll deals left" className="w-10 h-10 grid place-items-center rounded-full bg-white border border-gray-200 shadow-sm hover:border-ember hover:text-ember transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Scroll deals right" className="w-10 h-10 grid place-items-center rounded-full bg-white border border-gray-200 shadow-sm hover:border-ember hover:text-ember transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </header>
        <ul ref={scroller} className="flex gap-4 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6" role="list">
          {deals.map(deal => {
            const savingMinorUnits = deal.listPriceMinorUnits && deal.listPriceMinorUnits > deal.priceMinorUnits ? deal.listPriceMinorUnits - deal.priceMinorUnits : 0;
            return (
              <li key={deal.id} className="snap-start shrink-0 w-[75%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={deal.productId ? `/products/${deal.productId}` : '/deals'} className="group block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-ember transition-all h-full flex flex-col" suppressHydrationWarning>
                  <div className="relative w-full aspect-square bg-white mb-3 shrink-0 rounded-md overflow-hidden">
                    {deal.image && (
                      <Image src={storefrontImage(deal.image) || '/product-placeholder.svg'} alt="" fill sizes="240px" className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <span className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-sm bg-ember text-white text-[11px] font-bold px-2 py-1 uppercase tracking-wider">{deal.dealLabel}</span>
                    </span>
                  </div>
                  <p className="text-sm font-bold line-clamp-2 leading-snug text-gray-900 group-hover:text-ember transition-colors mb-3">{deal.productName}</p>
                  
                  <div className="mt-auto">
                    <span className="block text-xl font-extrabold text-gray-900" suppressHydrationWarning>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(deal.priceMinorUnits / 100)}
                    </span>
                    {savingMinorUnits > 0 && deal.listPriceMinorUnits && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 line-through" suppressHydrationWarning>
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
    <section aria-label="Why shop with Storegrill" className="bg-ember-pale border-b border-gray-200">
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
    <section className="border-b border-gray-200" aria-label="Pick up where you left off">
      <div className="container-fluid py-10 md:py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Pick up where you left off</h2>
        <div className="relative group/recent">
          <ul
            ref={scrollerRef}
            data-testid="recent-scroller"
            className="flex gap-5 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6"
            role="list"
          >
            {items.map(item => (
              <li key={item.slug} className="snap-start shrink-0 w-[75%] sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={`/products/${item.slug}`} className="group flex h-full flex-col rounded-xs border border-gray-200 bg-white overflow-hidden hover:border-ember hover:shadow-md transition-all">
                  <span className="relative block aspect-square bg-gray-50 overflow-hidden">
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
                    <span className="text-sm font-medium leading-snug text-gray-900 line-clamp-2 min-h-[2.5rem] group-hover:text-ember transition-colors">{item.name}</span>
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
                className="absolute left-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next recently viewed items"
                className="absolute right-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-900 hover:bg-white opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
    <section className="border-b border-gray-200" aria-labelledby="vendor-spotlight-heading">
      <div className="container-fluid py-10 md:py-12">
      <div className="flex items-end justify-between mb-6">
        <h2 id="vendor-spotlight-heading" className="text-2xl md:text-3xl font-bold text-gray-900">Featured Vendors</h2>
        <Link href="/vendors" className="text-sm font-bold text-ember hover:underline underline-offset-4">All vendors</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {vendors.slice(0, 3).map(v => (
          <Link key={v.slug} href={`/vendors/${v.slug}`} className="rounded-xs bg-white border border-gray-200 p-4 flex items-center gap-5 hover:border-ember transition-colors group">
            <span className="w-16 h-16 rounded-full bg-gradient-to-br from-ember to-ember-dark text-white grid place-items-center font-bold text-lg shrink-0 overflow-hidden">
              {v.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                v.storeName.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-gray-900 group-hover:text-ember transition-colors truncate">{v.storeName}</span>
              <span className="block text-xs font-medium text-gray-500 mt-1">
                ★ {v.rating > 0 ? v.rating.toFixed(1) : 'New'} · {v.reviewCount.toLocaleString()} reviews
              </span>
            </span>
            <span className="shrink-0 text-gray-400 group-hover:text-ember transition-colors">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </span>
          </Link>
        ))}
      </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    role: 'Tech Enthusiast',
    avatar: '/users/user-01.jpg',
    quote: 'Absolutely love the variety of products on Storegrill! The hero carousel makes it so easy to spot the best deals.',
  },
  {
    name: 'Mark Davis',
    role: 'Gamer',
    avatar: '/users/user-02.jpg',
    quote: 'Fast shipping and great customer service. Definitely my go-to for gaming gear.',
  },
  {
    name: 'Emily Chen',
    role: 'Home Decorator',
    avatar: '/users/user-03.jpg',
    quote: 'The deals are unbeatable and the website is so user-friendly. Highly recommended!',
  },
];

export function Testimonials() {
  const [isClient, setIsClient] = useState(false);
  const sliderRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <section className="border-b border-gray-200 py-10 md:py-16 bg-gray-50"><div className="container-fluid"><div className="h-64" /></div></section>;

  return (
    <section className="border-b border-gray-200 py-10 md:py-16 bg-gray-50">
      <div className="container-fluid">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">What Our Customers Say</h2>
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
            {TESTIMONIALS.map((t, i) => (
              <SwiperSlide key={i} className="h-auto">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Image key={j} src="/icons/icon-star.svg" alt="star" width={16} height={16} />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 flex-grow">{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <Image src={t.avatar} alt={t.name} width={40} height={40} className="rounded-full" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
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
