'use client';

import Link from 'next/link';
import { useRef } from 'react';
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

export function AmazonHomeGrid({ sections, heroSlides: _heroSlides, recent, regionKey, language }: AmazonHomeGridProps) {
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

  const firstGridSection = sections.find(row => row.some(item => !('type' in item && item.type === 'promo'))) as any;
  const dealTiles = firstGridSection?.[0]?.tiles?.slice(0, 4) || [];

  return (
    <div className="bg-[#eaeded] min-h-screen text-text-primary relative overflow-hidden pb-16">
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

          {/* Horizontal Cards Scrollable Strip (Accurate Amazon card dimensions ~316px width x 420px height) */}
          <div
            ref={scrollRef}
            className="flex items-stretch gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 pt-1 px-1"
          >
            {/* Card 1: Free Delivery on your first order (#ff9900 Amazon Orange) */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-[#ff9900] text-black p-6 rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px] relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-black leading-tight tracking-tight mb-2 text-black">
                  Free delivery on your first order
                </h2>
                <p className="text-sm font-bold text-black/90">Try us, no delivery fee.</p>
              </div>
              <div className="my-auto py-4 relative flex justify-center">
                <div className="w-full h-36 bg-white/40 rounded-xs flex items-center justify-center border border-black/10 shadow-inner">
                  <div className="text-center font-black text-xs uppercase tracking-wider text-black px-2">
                    📦 Storegrill Prime Express Delivery
                  </div>
                </div>
              </div>
              <div className="relative z-10 pt-2 border-t border-black/20">
                <span className="text-xs font-bold text-black">New customers only. T&Cs apply.</span>
              </div>
            </div>

            {/* Card 2: Live / Video Creative Card (Porto v Man City style) */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-[#131a22] text-white rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px] relative overflow-hidden group/card">
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 z-10" />
              <div className="absolute inset-0 opacity-90 group-hover/card:scale-105 transition-transform duration-700 bg-neutral-900">
                <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-base">
                  ⚽ Live Match Stream
                </div>
              </div>
              <div className="relative z-20 p-5">
                <span className="bg-[#00a8e8] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-xs uppercase tracking-wider">prime video</span>
                <h3 className="text-2xl font-black mt-2 text-white">Porto v Man City</h3>
                <p className="text-xs font-semibold text-neutral-300 mt-0.5">From 18:30 PM</p>
              </div>
              <div className="relative z-20 p-4 flex items-center justify-between border-t border-white/10 bg-black/60">
                <span className="text-xs font-bold text-neutral-200">Watch Live in HD</span>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">↺</span>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">🔇</span>
                </div>
              </div>
            </div>

            {/* Card 3: Shop deals ending soon (Coral pink #ff6f59 with white product tiles) */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-[#ff6f59] text-white p-5 rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px]">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-3">Shop deals ending soon</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {dealTiles.length > 0 ? (
                    dealTiles.map((tile: any, idx: number) => (
                      <a key={idx} href={tile.href} className="bg-white p-2 rounded-xs border border-neutral-300 hover:border-black transition-colors group/tile">
                        <div className="w-full h-20 relative bg-neutral-100 rounded-xs overflow-hidden mb-1.5">
                          <img src={tile.image} alt={tile.title} className="object-cover w-full h-full group-hover/tile:scale-105 transition-transform" />
                        </div>
                        <span className="inline-block bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                          {idx === 0 ? '15% off' : idx === 1 ? '30% off' : idx === 2 ? '39% off' : '20% off'}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-white py-10 text-center">Loading daily deals...</div>
                  )}
                </div>
              </div>
              <div className="pt-3">
                <a href="/deals" className="text-xs font-bold text-white hover:underline">See all deals →</a>
              </div>
            </div>

            {/* Card 4: Entertainment anywhere (Fire HD style) */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-gradient-to-br from-[#ff7a00] to-[#e63946] text-white p-6 rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px]">
              <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">Entertainment anywhere</h3>
                <p className="text-xs font-bold text-white/95">Read, watch, play</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-xs text-xs font-bold">
                  fire <span className="text-cyan-300 font-extrabold">HD 10</span>
                </div>
              </div>
              <div className="my-auto py-4 bg-black/20 rounded-xs p-3 text-center border border-white/20">
                <span className="text-xs font-extrabold text-white">📱 Tablet & Streaming Deals</span>
              </div>
              <div>
                <a href="/deals" className="text-xs font-bold text-white underline hover:opacity-80">Shop Fire Tablets →</a>
              </div>
            </div>

            {/* Card 5: Second Chance Deal Days */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-[#e3d5ca] text-neutral-900 p-6 rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px]">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-1">Second Chance Deal Days</h3>
                <p className="text-xs font-bold text-neutral-700">1-10 Sept.</p>
              </div>
              <div className="my-auto py-6 bg-white/80 rounded-xs p-3 text-center border border-neutral-300 shadow-inner">
                <span className="text-xs font-extrabold text-neutral-900">Certified Refurbished & Open Box Deals</span>
              </div>
              <div>
                <a href="/deals" className="text-xs font-bold text-[#007185] hover:underline">Explore Second Chance →</a>
              </div>
            </div>

            {/* Card 6: Cosy Home Accessories */}
            <div className="w-[300px] sm:w-[316px] shrink-0 bg-[#d8f3dc] text-neutral-900 p-6 rounded-xs shadow-sm flex flex-col justify-between snap-start h-[420px]">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-1">Cosy home accessories</h3>
                <p className="text-xs font-bold text-neutral-700">Discover now</p>
              </div>
              <div className="my-auto py-6 bg-white/80 rounded-xs p-3 text-center border border-neutral-300 shadow-inner">
                <span className="text-xs font-extrabold text-neutral-900">Interior Decor & Lighting</span>
              </div>
              <div>
                <a href="/categories" className="text-xs font-bold text-[#007185] hover:underline">Shop Home →</a>
              </div>
            </div>
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
