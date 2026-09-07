'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RegionContext';
import { useStore } from '@/lib/store';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';
import { getHomeFeed } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';
import type {
  HomeCreativeModule,
  HomeDealItem,
  HomeFeed,
  HomeHeroSlide,
  HomeModule,
} from '@Storegrill/shared';

function HeroImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  return <Image src={src} alt={alt} fill className="object-cover" />;
}

function Hero({ slides, regionKey }: { slides: HomeHeroSlide[]; regionKey: string }) {
  const t = useTranslations();
  const language = useStore(s => s.language) || 'en';
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex(i => (i + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length, regionKey]);

  const slide = slides[Math.min(index, slides.length - 1)];
  if (!slide) return null;

  const endLabel = slide.endsAt
    ? t('homeEndsOn', new Date(slide.endsAt).toLocaleDateString(language, { day: 'numeric', month: 'short' }))
    : '';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-[320px] w-full overflow-hidden rounded-xl shadow-lg md:h-[400px]"
    >
      {slide.variant === 'deal' ? (
        <div className="absolute inset-0 bg-smoke-150">
          <HeroImage src={slide.image} alt="" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ember via-ember-dark to-deep" />
      )}

      <div
        className={cn(
          'absolute inset-0 flex flex-col justify-center gap-3 p-6 md:p-12',
          slide.variant === 'deal' ? 'max-w-[64%] items-start text-white' : 'items-center text-center',
        )}
      >
        {slide.variant === 'deal' && slide.discountPercent ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[0.75rem] font-bold tracking-wide backdrop-blur-sm">
            {slide.cap ? t('homePercentOffUpTo', slide.discountPercent) : t('homePercentOff', slide.discountPercent)}
            {endLabel ? <span className="font-medium text-white/85">· {endLabel}</span> : null}
          </span>
        ) : null}

        {slide.variant === 'deal' && slide.listPriceMinorUnits ? (
          <span className="inline-flex w-fit items-baseline gap-2 rounded-lg bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
            <span className="text-lg font-black leading-none tracking-tight text-sale md:text-2xl">
              {formatPrice(slide.priceMinorUnits ?? 0, slide.currencyCode ?? 'GBP')}
            </span>
            <span className="text-xs font-semibold leading-none text-text-tertiary line-through md:text-sm">
              {formatPrice(slide.listPriceMinorUnits, slide.currencyCode ?? 'GBP')}
            </span>
          </span>
        ) : null}

        <h2
          className={cn(
            'text-balance text-2xl font-bold leading-tight drop-shadow-sm md:text-4xl',
            slide.variant === 'brand' ? 'text-white' : 'text-white',
          )}
        >
          {slide.titleIsKey ? t(slide.title) : slide.title}
        </h2>

        {slide.variant === 'brand' ? (
          <p className="max-w-xl text-balance text-sm font-medium text-white/80 md:text-base">
            {t('homeHeroBrandSubtitle')}
          </p>
        ) : null}

        <Link
          href={slide.ctaHref}
          className={cn(
            'btn mt-2 h-10 rounded-pill px-5 text-[0.875rem] font-bold transition-transform duration-200 hover:scale-[1.03]',
            slide.variant === 'brand' ? 'bg-white text-ember' : 'bg-white text-charcoal',
          )}
        >
          {t(slide.ctaKey)}
        </Link>
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DealPrice({ item }: { item: HomeDealItem }) {
  return (
    <span className="mt-1.5 flex items-baseline gap-1.5">
      <span className="text-[0.875rem] font-extrabold leading-none tracking-tight text-sale">
        {formatPrice(item.priceMinorUnits, item.currencyCode)}
      </span>
      <span className="text-xs text-text-tertiary line-through">
        {formatPrice(item.listPriceMinorUnits, item.currencyCode)}
      </span>
    </span>
  );
}

function CategoryCardView({ module }: { module: Extract<HomeModule, { kind: 'category' }> }) {
  const t = useTranslations();
  return (
    <section aria-labelledby={`home-cat-${module.id}`} className="card rounded-lg bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={`home-cat-${module.id}`} className="text-[1.0625rem] font-bold leading-snug text-charcoal">
          {module.name}
        </h2>
        <Link
          href={`/categories/${module.slug}`}
          className="shrink-0 text-[0.8125rem] font-medium text-text-link hover:text-text-link-hover hover:underline"
        >
          {t('homeSeeMore')}
        </Link>
      </header>
      <ul className="grid grid-cols-2 gap-2" role="list">
        {module.tiles.map(tile => (
          <li key={tile.productId}>
            <Link
              href={`/products/${tile.slug}`}
              aria-label={tile.name}
              className="block overflow-hidden rounded-md bg-smoke-100 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span className="block aspect-square w-full relative">
                {tile.image ? <Image src={tile.image} alt={tile.name || ''} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" /> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DealsRailView({ module }: { module: Extract<HomeModule, { kind: 'deals' }> }) {
  const t = useTranslations();
  return (
    <section aria-labelledby="home-deals-heading" className="card rounded-lg bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="home-deals-heading" className="text-[1.0625rem] font-bold leading-snug text-charcoal">
          {t(module.headingKey)}
        </h2>
        <Link
          href="/deals"
          className="shrink-0 text-[0.8125rem] font-medium text-text-link hover:text-text-link-hover hover:underline"
        >
          {t('homeDealsSeeAll')}
        </Link>
      </header>
      <ul className="scroll-row" role="list">
        {module.items.map(item => (
          <li key={item.dealId}>
            <Link href={`/deals/${item.dealSlug}`} className="block w-40">
              <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-smoke-100">
                {item.image ? <Image src={item.image} alt={item.name || ''} fill sizes="160px" className="object-cover" /> : null}
                <span className="absolute bottom-1.5 left-1.5 z-10 rounded bg-white/95 px-1.5 py-0.5 text-xs font-bold leading-none text-sale shadow-sm">
                  {item.cap ? t('homePercentOffUpTo', item.discountPercent) : t('homePercentOff', item.discountPercent)}
                </span>
              </span>
              <span className="mt-2 block text-[0.8125rem] font-medium leading-snug text-charcoal line-clamp-2">
                {item.name}
              </span>
              <DealPrice item={item} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreativeBannerView({ module }: { module: HomeCreativeModule }) {
  const t = useTranslations();
  const dark = module.theme === 'dark';
  return (
    <Link
      href={module.href}
      className={cn(
        'group flex items-center justify-between gap-4 rounded-lg px-5 py-5 transition-transform duration-200 hover:-translate-y-0.5 md:px-7',
        dark ? 'bg-gradient-to-r from-ember via-ember-dark to-deep text-white shadow-md' : 'card bg-white',
      )}
    >
      <span className="min-w-0">
        <span className={cn('block text-[1.0625rem] font-bold', dark ? 'text-white' : 'text-charcoal')}>
          {t(module.titleKey)}
        </span>
        <span
          className={cn(
            'mt-1 block text-[0.8125rem] leading-relaxed',
            dark ? 'text-white/85' : 'text-text-tertiary',
          )}
        >
          {t(module.bodyKey)}
        </span>
      </span>
      <span
        className={cn(
          'btn shrink-0 h-9 rounded-pill px-4 text-[0.8125rem] font-bold',
          dark ? 'bg-white text-ember' : 'bg-ember text-white group-hover:bg-ember-dark',
        )}
      >
        {t(module.ctaKey)}
      </span>
    </Link>
  );
}

function ModuleView({ module }: { module: HomeModule }) {
  switch (module.kind) {
    case 'category':
      return <CategoryCardView module={module} />;
    case 'deals':
      return <DealsRailView module={module} />;
    case 'creative':
      return <CreativeBannerView module={module} />;
    case 'recently':
      return <RecentlyViewed />;
  }
}

function FeedSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="h-[320px] rounded-xl bg-smoke-150 md:h-[400px]" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-smoke-150" />
        ))}
      </div>
    </div>
  );
}

export function HomeFeed({ initial, regionKey }: { initial: HomeFeed | null; regionKey: string }) {
  const t = useTranslations();
  const [hero] = useState<HomeHeroSlide[]>(initial?.hero ?? []);
  const [modules, setModules] = useState<HomeModule[]>(initial?.modules ?? []);
  const [page, setPage] = useState(initial?.page ?? 0);
  const [more, setMore] = useState(initial?.more ?? false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || failed) return;
    setLoading(true);
    const next = await getHomeFeed(regionKey, page + 1);
    if (!next) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setModules(current => [...current, ...next.modules]);
    setPage(next.page);
    setMore(next.more);
    setLoading(false);
  }, [loading, failed, page, regionKey]);

  useEffect(() => {
    if (!more || loading || failed) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [more, loading, failed, loadMore]);

  if (!initial) {
    return (
      <div className="container-site py-6 md:py-8">
        <FeedSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-canvas">
      <div className="container-site py-6 md:py-8">
        <div className="space-y-6">
          {hero.length > 0 ? <Hero slides={hero} regionKey={regionKey} /> : null}
          {modules.map((module, i) => {
            const key =
              module.kind === 'category' || module.kind === 'creative' ? module.id : `${module.kind}-${i}`;
            return (
              <div key={key} className="animate-fade-in">
                <ModuleView module={module} />
              </div>
            );
          })}
        </div>

        <div ref={sentinelRef} aria-hidden="true" />
        {loading ? (
          <p className="py-8 text-center text-sm text-text-tertiary">{t('homeLoading')}</p>
        ) : null}
        {failed ? <p className="py-8 text-center text-sm text-text-tertiary">{t('homeError')}</p> : null}
      </div>
    </div>
  );
}