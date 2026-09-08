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

      {/* Hero Banner Carousel & Amazon Hero Cards Row */}
      <div className="max-w-[1500px] mx-auto px-4 pt-3 relative z-10">
        <div className="relative w-full bg-neutral-900 rounded-sm overflow-hidden shadow-md">
          {/* Main Hero Banner / Carousel Area */}
          <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] max-h-[420px]">
            <Image
              src={slide?.image || '/banners/bannerOne.jpg'}
              alt={slide?.title || 'Storegrill Deals'}
              fill
              priority
              className="object-cover opacity-90 transition-opacity duration-500"
              sizes="100vw"
            />
            {/* Amazon-style gradient lighting overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-200 via-transparent to-black/40 pointer-events-none" />

            {/* Navigation Arrows (Amazon desktop style) */}
            <button
              type="button"
              onClick={() => setCurrentSlide((currentSlide - 1 + slideCount) % slideCount)}
              aria-label="Previous slide"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-28 bg-black/30 hover:bg-black/60 flex items-center justify-center text-white text-4xl font-light rounded-r-sm transition-all focus:outline-none border border-white/20 z-20"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((currentSlide + 1) % slideCount)}
              aria-label="Next slide"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-28 bg-black/30 hover:bg-black/60 flex items-center justify-center text-white text-4xl font-light rounded-l-sm transition-all focus:outline-none border border-white/20 z-20"
            >
              ›
            </button>

            {/* Slide info overlay bottom left with live deal pricing & discount */}
            {slide ? (
              <div className="absolute bottom-6 left-6 md:left-12 z-20 bg-white/95 backdrop-blur-sm px-6 py-4 rounded-sm shadow-lg max-w-lg border border-neutral-200">
                {slide.discountPercent ? (
                  <div className="inline-block bg-ember text-white text-xs font-bold px-2 py-0.5 rounded-sm mb-1.5">
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
                <Link href={slide.href} className="inline-block mt-2.5 text-xs font-bold text-ember hover:text-ember-dark hover:underline">
                  Shop deal →
                </Link>
              </div>
            ) : null}

            {/* Slide Indicator Dots */}
            {slideCount > 1 ? (
              <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      idx === currentSlide ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/80'
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

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