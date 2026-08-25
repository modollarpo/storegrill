'use client';

import Link from 'next/link';
import { Children, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { storefrontImage } from '@/lib/images';

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
        className="flex gap-4 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6 lg:gap-6 lg:scroll-pl-6"
      >
        {Children.map(children, child =>
          child ? (
            <li className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)] shrink-0 snap-start">
              {child}
            </li>
          ) : null
        )}
      </ul>
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous popular products"
        className="absolute left-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next popular products"
        className="absolute right-2 top-[42%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
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
                <span className="w-16 h-16 rounded-full bg-action-primary/10 text-action-primary grid place-items-center shrink-0 shadow-inner">
                  <Image src={col.icon} alt="" width={38} height={38} className="rounded-full object-cover" />
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
                    className="group block overflow-hidden rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-action-primary"
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
                    <span className="flex items-center min-h-[64px] bg-surface-raised px-4 py-3 text-sm font-bold leading-snug text-text-primary group-hover:text-action-primary transition-colors">
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
      <div>
        <div className="mb-6">
          <h2 id={`${id}-spotlight-heading`} className="text-2xl md:text-3xl font-bold text-center text-text-primary">
            {heading}
          </h2>
          {subtitle && (
            <p className="mt-1 text-body-md text-center text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>
        <div className="relative group/slider">
          <ul
            ref={scroller}
            data-testid={`${id}-scroller`}
            className="flex gap-4 px-4 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-pl-4 sm:px-6 sm:scroll-pl-6 md:gap-6 md:scroll-pl-6 lg:gap-7 lg:scroll-pl-7"
          >
            {tiles.map(tile => (
<li
                key={tile.src}
                className="w-full sm:w-[calc(25%-8px)] md:w-[calc(25%-8px)] lg:w-[calc(25%-8px)]"
              >
                <Link
                  href={tile.href}
                  aria-label={tile.label}
                  className="group block overflow-hidden rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-action-primary shadow-sm hover:shadow-elevated transition-shadow"
                >
                  <span className="relative block aspect-[510/440] bg-surface-sunken overflow-hidden">
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      sizes="(max-width:640px) 88vw, (max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                  <span className="flex items-center justify-center min-h-[56px] bg-surface px-4 py-3 text-center text-sm font-bold leading-snug text-text-primary group-hover:text-action-primary transition-colors">
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
            className="absolute left-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => scrollTiles(1)}
            aria-label={`Next ${id} offers`}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
  body: string;
  cta: string;
  className: string;
}

const CAMPAIGN_TILES: CampaignTile[] = [
  {
    href: '/deals',
    title: 'Great deals on top brands',
    body: 'Limited-time savings across tech, home and kitchen.',
    cta: 'Shop Deals',
    className: 'bg-ember-gradient text-white md:row-span-2',
  },
  {
    href: '/payments',
    title: 'Spread the cost',
    body: 'Flexible payment options on eligible orders.',
    cta: 'Ways to pay',
    className: 'bg-charcoal text-white',
  },
  {
    href: '/shipping',
    title: 'Free delivery',
    body: 'On eligible orders, straight to your door.',
    cta: 'Delivery options',
    className: 'bg-surface border border-border text-text-primary',
  },
];

function CampaignCard({ tile }: { tile: CampaignTile }) {
  const inverted = !tile.className.includes('border-border');
  return (
    <Link
      href={tile.href}
      aria-label={`${tile.title} — ${tile.cta}`}
      className={`group flex flex-col justify-between gap-6 rounded-xs p-6 md:p-8 transition-transform duration-normal hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-action-primary ${tile.className}`}
    >
      <div>
        <h2 className={`text-heading-xl md:text-display-sm font-bold leading-tight ${inverted ? 'text-white' : 'text-text-primary'}`}>
          {tile.title}
        </h2>
        <p className={`mt-2 text-sm md:text-body-md max-w-sm ${inverted ? 'text-white/75' : 'text-text-secondary'}`}>
          {tile.body}
        </p>
      </div>
      <span
        className={`inline-flex w-fit items-center rounded-xs border px-4 py-2 text-sm font-bold transition-colors ${
          inverted
            ? 'border-white/70 text-white group-hover:bg-white group-hover:text-charcoal'
            : 'border-text-primary text-text-primary group-hover:bg-action-primary group-hover:border-action-primary group-hover:text-white'
        }`}
      >
        {tile.cta}
      </span>
    </Link>
  );
}

export function CampaignHero() {
  return (
    <section aria-label="Featured campaigns" className="bg-surface border-b border-border">
      <div className="container-fluid py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {CAMPAIGN_TILES.map(tile => (
            <CampaignCard key={tile.href} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryQuickNav({ items }: { items: QuickNavItem[] }) {
  return (
    <nav aria-label="Shop by category" className="border-b border-border">
      <div className="container-fluid py-6 md:py-8">
      <ul className="flex gap-3 overflow-x-auto scrollbar-none pb-1 snap-x" role="list">
        {items.map(item => (
          <li key={item.slug} className="snap-start shrink-0">
            <Link
              href={`/products?category=${item.slug}`}
              className="group flex h-11 items-center gap-2.5 whitespace-nowrap rounded-xs border border-border bg-surface px-4 text-sm font-bold text-text-primary transition-colors hover:border-action-primary hover:text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action-primary"
            >
              <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </nav>
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
    scroller.current?.scrollBy({ left: dir * 600, behavior: 'smooth' });
  }

  if (deals.length === 0) return null;

  return (
    <section className="border-b border-border py-10 md:py-12" aria-label="Deals of the day">
      <div className="container-fluid">
        <header className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Deals Of The Day</h2>
          <div className="hidden sm:flex gap-3">
            <button type="button" onClick={() => scroll(-1)} aria-label="Scroll deals left" className="w-10 h-10 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-action-primary hover:text-action-primary transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Scroll deals right" className="w-10 h-10 grid place-items-center rounded-full bg-surface border border-border shadow-sm hover:border-action-primary hover:text-action-primary transition-all">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </header>
        <ul ref={scroller} className="flex gap-5 overflow-x-auto scrollbar-none snap-x pb-4" role="list">
          {deals.map(deal => {
            const savingMinorUnits = deal.listPriceMinorUnits && deal.listPriceMinorUnits > deal.priceMinorUnits ? deal.listPriceMinorUnits - deal.priceMinorUnits : 0;
            return (
              <li key={deal.id} className="snap-start shrink-0 w-full sm:w-[calc(33.333%-12px)] lg:w-[calc(25%-12px)]">
                <Link href={deal.productId ? `/products/${deal.productId}` : '/deals'} className="group block bg-surface border border-border rounded-lg p-4 hover:shadow-elevated hover:border-action-primary transition-all h-full flex flex-col">
                  <div className="relative w-full aspect-square bg-surface mb-3 shrink-0 rounded-md overflow-hidden">
                    {deal.image && (
                      <Image src={storefrontImage(deal.image) || '/product-placeholder.svg'} alt="" fill sizes="240px" className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <span className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-sm bg-action-primary text-white text-[11px] font-bold px-2 py-1 uppercase tracking-wider">{deal.dealLabel}</span>
                    </span>
                  </div>
                  <p className="text-sm font-bold line-clamp-2 leading-snug text-text-primary group-hover:text-action-primary transition-colors mb-3">{deal.productName}</p>
                  
                  <div className="mt-auto">
                    <span className="block text-xl font-extrabold text-text-primary">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(deal.priceMinorUnits / 100)}
                    </span>
                    {savingMinorUnits > 0 && deal.listPriceMinorUnits && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary line-through">
                          Was {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode }).format(deal.listPriceMinorUnits / 100)}
                        </span>
                        <span className="text-xs text-action-primary font-bold bg-action-primary/10 px-1.5 py-0.5 rounded-sm">
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
    title: 'Fast Delivery',
    body: 'Regional warehouses ship in 24h',
    iconPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  },
  {
    title: 'Secure Payment',
    body: 'Stripe & PayPal buyer protection',
    iconPath: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  },
  {
    title: 'Easy Returns',
    body: '30-day no-question returns',
    iconPath: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  },
  {
    title: '24/7 Support',
    body: 'Help in your language',
    iconPath: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
  },
];

export function TrustBar() {
  return (
    <section aria-label="Why shop with Storegrill" className="border-b border-border">
      <div className="container-fluid py-10 md:py-12">
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6" role="list">
        {TRUST_ITEMS.map(item => (
          <li key={item.title} className="flex items-start gap-4 p-5 rounded-xs bg-surface border border-border hover:border-action-primary transition-colors">
            <span aria-hidden="true" className="w-11 h-11 shrink-0 grid place-items-center rounded-xs bg-ember-pale text-action-primary">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
              <p className="text-xs text-text-secondary mt-1">{item.body}</p>
            </div>
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
              <li key={item.slug} className="snap-start shrink-0 w-full sm:w-[calc(20%-8px)] lg:w-[calc(25%-12px)]">
                <Link href={`/products/${item.slug}`} className="group flex h-full flex-col rounded-xs border border-border bg-surface overflow-hidden hover:border-action-primary hover:shadow-elevated transition-all">
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
                    <span className="text-sm font-medium leading-snug text-text-primary line-clamp-2 min-h-[2.5rem] group-hover:text-action-primary transition-colors">{item.name}</span>
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
                className="absolute left-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next recently viewed items"
                className="absolute right-2 top-[38%] -translate-y-1/2 z-10 w-11 h-11 grid place-items-center rounded-full bg-surface shadow-lg border border-border text-text-primary hover:bg-surface-raised opacity-0 group-hover/recent:opacity-100 focus-visible:opacity-100 active:scale-95 transition-all"
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
        <Link href="/vendors" className="text-sm font-bold text-action-primary hover:underline underline-offset-4">All vendors</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {vendors.slice(0, 3).map(v => (
          <Link key={v.slug} href={`/vendors/${v.slug}`} className="rounded-xs bg-surface border border-border p-4 flex items-center gap-5 hover:border-action-primary transition-colors group">
            <span className="w-16 h-16 rounded-full bg-gradient-to-br from-action-primary to-ember-dark text-white grid place-items-center font-bold text-lg shrink-0 overflow-hidden">
              {v.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                v.storeName.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-text-primary group-hover:text-action-primary transition-colors truncate">{v.storeName}</span>
              <span className="block text-xs font-medium text-text-secondary mt-1">
                ★ {v.rating > 0 ? v.rating.toFixed(1) : 'New'} · {v.reviewCount.toLocaleString()} reviews
              </span>
            </span>
            <span className="shrink-0 text-border-strong group-hover:text-action-primary transition-colors">
              <svg className="w-5 h-5 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </span>
          </Link>
        ))}
      </div>
      </div>
    </section>
  );
}
