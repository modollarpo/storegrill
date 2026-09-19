'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { t } from '@/i18n';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';
import { CategoryRowGrid } from '@/components/commerce/grid';
import { RecentlyAddedFeed } from '@/components/home/RecentlyAddedFeed';
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
  const isCategory = !!slide.eyebrow;

  if (isCategory) {
    return (
      <Link
        href={slide.href}
        className="w-[280px] sm:w-[300px] shrink-0 snap-start h-[420px] relative overflow-hidden rounded-2xl shadow-sm group/card flex flex-col justify-between"
        style={{ backgroundColor: bg, color: slide.textColor || 'white' }}
      >
        {slide.badgeText ? (
          <div className="absolute top-5 left-5 z-20">
            <span
              className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: slide.badgeBg || slide.accentColor,
                color: slide.badgeTextColor || bg,
              }}
            >
              {slide.badgeText}
            </span>
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col gap-2 px-6 pt-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70" style={{ color: slide.textColor || 'white' }}>
            {slide.eyebrow}
          </span>
          <h2 className="text-[26px] sm:text-[30px] font-extrabold leading-[1.08] tracking-tight max-w-[240px]" style={{ color: slide.textColor || 'white' }}>
            {slide.title}
          </h2>
          <p className="text-[13px] leading-relaxed opacity-75 max-w-[220px] mt-1" style={{ color: slide.textColor || 'white' }}>
            {slide.subtitle}
          </p>
        </div>

        <div className="relative z-10 px-6 pb-6">
          <span
            className="inline-flex items-center gap-2 text-[13px] font-semibold group-hover/card:gap-3 transition-all duration-200"
            style={{ color: slide.accentColor }}
          >
            {slide.ctaText}
            <svg className="w-4 h-4 transition-transform duration-200 group-hover/card:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        <div className="absolute bottom-0 right-0 w-[55%] h-[65%] pointer-events-none z-0">
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            sizes="300px"
            className="object-contain object-bottom-right mix-blend-multiply opacity-90 group-hover/card:scale-[1.03] transition-transform duration-500 ease-out"
          />
        </div>

        <div
          className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: slide.accentColor }}
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <Link
      href={slide.href}
      className="w-[280px] sm:w-[300px] shrink-0 snap-start h-[420px] relative overflow-hidden rounded-md shadow-sm group/card flex flex-col"
      style={{ backgroundColor: bg }}
    >
      {slide.discountPercent ? (
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-block bg-white/95 text-[11px] font-extrabold px-2.5 py-1 rounded shadow-sm" style={{ color: bg }}>
            {slide.discountPercent}% OFF
          </span>
        </div>
      ) : null}

      <div className="relative w-full h-[200px] flex items-center justify-center p-4 pt-12">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          sizes="300px"
          className="object-contain mix-blend-multiply group-hover/card:scale-105 transition-transform duration-500"
        />
      </div>

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
          </div>
        </div>
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
