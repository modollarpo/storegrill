'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';
import { CategoryRowGrid } from '@/components/commerce/grid';
import { RecentlyAddedFeed } from '@/components/home/RecentlyAddedFeed';
import type { HomeHeroSlide, HomeRecentFeed, HomeSectionItem } from '@/lib/home-content-build';

interface AmazonHomeGridProps {
  sections: HomeSectionItem[][];
  heroSlides: HomeHeroSlide[];
  recent?: HomeRecentFeed | null;
  regionKey?: string;
  language?: string;
}

export function AmazonHomeGrid({ sections, heroSlides, recent, regionKey, language }: AmazonHomeGridProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideCount = heroSlides.length;

  useEffect(() => {
    if (slideCount <= 1) {
      setCurrentSlide(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideCount]);

  const slide = heroSlides.length > 0 ? heroSlides[Math.min(currentSlide, heroSlides.length - 1)] : null;

  return (
    <div className="bg-neutral-200 min-h-screen text-text-primary relative overflow-hidden pb-16">
      {/* Decorative background representing regions/storefront feel (matching /regions style) */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-ember-pale to-transparent -z-10" />
      <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-ember/5 blur-[120px] -z-10" />
      <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-tealink/5 blur-[120px] -z-10" />

      {/* Hero Banner Carousel — showcase active deal products */}
      {slide ? (
        <div className="max-w-[1500px] mx-auto px-4 pt-4">
          <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] max-h-[420px] bg-neutral-900 rounded-xs overflow-hidden shadow-md">
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority
              className="object-cover opacity-90 transition-opacity duration-500"
              sizes="100vw"
            />
            {/* Gradient fade at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-200 via-transparent to-black/30 pointer-events-none" />

            {/* Navigation Arrows */}
            <button
              type="button"
              onClick={() => setCurrentSlide((currentSlide - 1 + slideCount) % slideCount)}
              aria-label="Previous slide"
              className="absolute left-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-transparent hover:bg-white/10 hover:border hover:border-white/40 flex items-center justify-center text-white text-3xl font-bold rounded-sm transition-all focus:outline-none"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((currentSlide + 1) % slideCount)}
              aria-label="Next slide"
              className="absolute right-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-transparent hover:bg-white/10 hover:border hover:border-white/40 flex items-center justify-center text-white text-3xl font-bold rounded-sm transition-all focus:outline-none"
            >
              ›
            </button>

            {/* Slide info overlay bottom left with live deal pricing & discount */}
            <div className="absolute bottom-6 left-6 md:left-12 z-10 bg-white/95 backdrop-blur-sm px-6 py-4 rounded-xs shadow-md max-w-lg">
              {slide.discountPercent ? (
                <div className="inline-block bg-ember text-white text-xs font-bold px-2 py-0.5 rounded-xs mb-1">
                  {slide.discountPercent}% OFF DEAL
                </div>
              ) : null}
              <h2 className="text-base md:text-xl font-bold text-text-primary line-clamp-1">{slide.title}</h2>
              <div className="flex items-baseline gap-2 mt-1">
                {slide.priceMinorUnits !== undefined ? (
                  <span className="text-lg font-bold text-ember">
                    {slide.currencyCode === 'GBP' ? '£' : slide.currencyCode === 'EUR' ? '€' : '$'}
                    {(slide.priceMinorUnits / 100).toFixed(2)}
                  </span>
                ) : null}
                {slide.listPriceMinorUnits && slide.listPriceMinorUnits > (slide.priceMinorUnits ?? 0) ? (
                  <span className="text-xs text-neutral-500 line-through">
                    {slide.currencyCode === 'GBP' ? '£' : slide.currencyCode === 'EUR' ? '€' : '$'}
                    {(slide.listPriceMinorUnits / 100).toFixed(2)}
                  </span>
                ) : null}
                <span className="text-xs text-neutral-600">{slide.subtitle}</span>
              </div>
              <Link href={slide.href} className="inline-block mt-2 text-xs font-bold text-ember hover:text-ember-dark hover:underline">
                Shop deal →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Overlapping / Stacked 4-Column Card Grid */}
      <div className={`max-w-[1500px] mx-auto px-4${slide ? ' -mt-24 sm:-mt-36 md:-mt-48' : ' pt-6'} relative z-20 pb-12`}>
        {sections.map((row, rowIndex) => (
          <CategoryRowGrid key={rowIndex} items={row} />
        ))}

        {/* Auto "Recently added" feed — grows as new categories and products land */}
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