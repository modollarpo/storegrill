'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';
import type { HomeHeroSlide, HomeSectionItem } from '@/lib/home-content-build';

interface AmazonHomeGridProps {
  sections: HomeSectionItem[][];
  heroSlides: HomeHeroSlide[];
}

export function AmazonHomeGrid({ sections, heroSlides }: AmazonHomeGridProps) {
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
      {/* Hero Banner Carousel — only when real active deals exist */}
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

            {/* Slide info overlay bottom left */}
            <div className="absolute bottom-6 left-6 md:left-12 z-10 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-xs shadow-md">
              <h2 className="text-lg md:text-xl font-bold text-text-primary">{slide.title}</h2>
              <p className="text-xs md:text-sm text-neutral-600">{slide.subtitle}</p>
              <Link href={slide.href} className="inline-block mt-2 text-xs font-bold text-sky-700 hover:underline">
                Shop now →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Overlapping / Stacked 4-Column Card Grid */}
      <div className={`max-w-[1500px] mx-auto px-4${slide ? ' -mt-24 sm:-mt-36 md:-mt-48' : ' pt-6'} relative z-20 pb-12`}>
        {sections.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {row.map((item, itemIndex) => {
              if (item.type === 'promo') {
                return (
                  <div
                    key={itemIndex}
                    className={cn(
                      'rounded-xs shadow-md p-5 flex flex-col justify-between border border-neutral-200 transition-all hover:shadow-lg',
                      item.bgClass || 'bg-white'
                    )}
                  >
                    <div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight mb-1">{item.title}</h3>
                      {item.subtitle && <p className="text-xs opacity-90 mb-3">{item.subtitle}</p>}
                    </div>
                    {item.image && (
                      <div className="relative w-full h-48 my-3 rounded-xs overflow-hidden bg-neutral-100">
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      </div>
                    )}
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-block mt-2 text-xs font-bold hover:underline",
                        item.bgClass?.includes('bg-neutral-900') ? "text-white underline" : "text-sky-700 hover:text-amber-700"
                      )}
                    >
                      {item.ctaText || 'Shop now'} &gt;
                    </Link>
                  </div>
                );
              }

              const section = item;
              return (
                <div
                  key={itemIndex}
                  className={cn(
                    "rounded-xs shadow-md p-5 flex flex-col justify-between border border-neutral-200 transition-all hover:shadow-lg",
                    section.cardBg || 'bg-white'
                  )}
                >
                  <div>
                    <h3 className="text-lg md:text-xl font-bold tracking-tight mb-3">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {section.tiles.map((tile, tileIdx) => (
                        <Link key={tileIdx} href={tile.href} className="group block">
                          <div className={cn("relative aspect-square w-full rounded-xs overflow-hidden mb-1 border border-neutral-200/60 shadow-xs", tile.bgOverride || 'bg-neutral-100')}>
                            <Image
                              src={tile.image}
                              alt={tile.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              sizes="(max-width: 640px) 50vw, 25vw"
                            />
                          </div>
                          <span className={cn("block text-xs font-medium group-hover:underline line-clamp-1", section.cardBg?.includes('text-white') ? 'text-white/90' : 'text-text-primary')}>
                            {tile.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={section.linkHref ?? '/products'}
                    className={cn("text-xs font-bold hover:underline mt-2 inline-block", section.cardBg?.includes('text-white') ? 'text-white underline' : 'text-sky-700 hover:text-amber-700')}
                  >
                    {section.linkText ?? 'See more'} &gt;
                  </Link>
                </div>
              );
            })}
          </div>
        ))}

        {/* Recently viewed by user */}
        <div className="mt-8 bg-white border border-neutral-200 rounded-xs shadow-sm p-6">
          <RecentlyViewed />
        </div>
      </div>
    </div>
  );
}