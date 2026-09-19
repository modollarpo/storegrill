'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { t } from '@/i18n';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';
import { CategoryRowGrid } from '@/components/commerce/grid';
import { RecentlyAddedFeed } from '@/components/home/RecentlyAddedFeed';
import { HeroCategoryCarousel } from '@/components/home/HeroCategoryCarousel';
import type { HomeHeroSlide, HomeRecentFeed, HomeSectionItem } from '@/lib/home-content-build';
import { heroPalette } from '@/design-system/tokens';

interface AmazonHomeGridProps {
  sections: HomeSectionItem[][];
  heroSlides: HomeHeroSlide[];
  recent?: HomeRecentFeed | null;
  regionKey?: string;
  language?: string;
}

function currencySymbol(code?: string): string {
  if (code === 'GBP') return '£';
  if (code === 'EUR') return '€';
  return '$';
}

function HeroCard({ slide }: { slide: HomeHeroSlide }) {
  const bg = slide.backgroundColor || heroPalette.charcoal;
  return (
    <Link
      href={slide.href}
      className="w-[280px] sm:w-[300px] shrink-0 snap-start h-[420px] relative overflow-hidden rounded-md shadow-sm group/card flex flex-col"
      style={{ backgroundColor: bg }}
    >
      {/* Discount badge */}
      {slide.discountPercent ? (
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-block bg-white/95 text-[11px] font-extrabold px-2.5 py-1 rounded shadow-sm" style={{ color: bg }}>
            {slide.discountPercent}% OFF
          </span>
        </div>
      ) : null}

      {/* Product image — contained, centered in top half, blend white bg away */}
      <div className="relative w-full h-[200px] flex items-center justify-center p-4 pt-12">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          sizes="300px"
          className="object-contain mix-blend-multiply group-hover/card:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Text content — bottom half */}
      <div className="flex-1 flex flex-col justify-end p-5 gap-2">
        <p className="text-sm font-bold text-white/95 line-clamp-1 drop-shadow-sm">{slide.subtitle}</p>
        <div className="flex items-center justify-between gap-2">
          {slide.priceMinorUnits !== undefined ? (
            <span className="text-2xl font-black text-white drop-shadow-sm">
              {currencySymbol(slide.currencyCode)}
              {(slide.priceMinorUnits / 100).toFixed(2)}
            </span>
          ) : null}
          <span className="shrink-0 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold px-3 py-1.5 rounded transition-colors">
            Shop deal →
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AmazonHomeGrid({ sections, heroSlides, recent, regionKey, language }: AmazonHomeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -420, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 420, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[var(--color-canvas)] min-h-screen text-text-primary relative overflow-hidden pb-16">
      {/* Amazon Desktop Hero Multi-Card Carousel Strip */}
      <div className="max-w-[1500px] mx-auto px-4 pt-3 relative z-10">
        <div className="relative group">
          {/* Left Arrow Button (Amazon Style) */}
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute -left-3 top-1/3 -translate-y-1/2 w-12 h-28 bg-white/90 hover:bg-white text-neutral-900 flex items-center justify-center text-3xl font-light rounded-r-md transition-all z-30 shadow-md border border-neutral-300 focus:outline-none"
          >
            ‹
          </button>
          
          {/* Right Arrow Button (Amazon Style) */}
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute -right-3 top-1/3 -translate-y-1/2 w-12 h-28 bg-white/90 hover:bg-white text-neutral-900 flex items-center justify-center text-3xl font-light rounded-l-md transition-all z-30 shadow-md border border-neutral-300 focus:outline-none"
          >
            ›
          </button>

          {/* Horizontal Cards Scrollable Strip (Amazon editorial card dimensions) */}
          <div
            ref={scrollRef}
            className="flex items-stretch gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 pt-1 px-1"
          >
            {heroSlides.map((slide, idx) => (
              <HeroCard key={idx} slide={slide} />
            ))}
            <Link
              href="/deals"
              className="w-[280px] sm:w-[300px] shrink-0 snap-start h-[420px] relative overflow-hidden rounded-md shadow-sm bg-gradient-to-br from-midnight via-ember-deep to-ember flex flex-col items-center justify-center gap-5 p-8 text-center group/cta"
            >
              <div
                aria-hidden="true"
                className="grid place-items-center w-16 h-16 rounded-full bg-white/10 text-white text-2xl font-black shadow-inner"
              >
                %
              </div>
              <h3 className="text-2xl font-black text-white leading-snug">{t(language ?? 'en', 'seeAllDeals')}</h3>
              <p className="text-sm font-semibold text-white/85">{t(language ?? 'en', 'homeDealsHeading')}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 bg-[var(--color-ember)] text-white text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md">
                {t(language ?? 'en', 'shopNow')} →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Category Carousel — editorial category tiles */}
      <div className="max-w-[1500px] mx-auto px-4 pt-8 relative z-10">
        <HeroCategoryCarousel />
      </div>

      {/* Overlapping / Stacked 4-Column Card Grid */}
      <div className="max-w-[1500px] mx-auto px-4 pt-6 relative z-20 pb-12">
        {sections.map((row, rowIndex) => (
          <CategoryRowGrid key={rowIndex} items={row} />
        ))}

        {/* Auto "Recently added" feed */}
        {recent && regionKey && language ? (
          <RecentlyAddedFeed
            regionKey={regionKey}
            language={language}
            initialRows={recent.rows}
            hasMore={recent.hasMore}
            nextOffset={recent.nextOffset}
          />
        ) : null}

        {/* Recently viewed by user */}
        <div className="mt-8 bg-white border border-neutral-200 rounded-xs shadow-sm p-6">
          <RecentlyViewed />
        </div>
      </div>
    </div>
  );
}
