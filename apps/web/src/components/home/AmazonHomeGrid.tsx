'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const firstGridSection = sections.find(row => row.some(item => !('type' in item && item.type === 'promo'))) as any;
  const dealTiles = firstGridSection?.[0]?.tiles?.slice(0, 4) || [];

  return (
    <div className="bg-neutral-200 min-h-screen text-text-primary relative overflow-hidden pb-16">
      {/* Decorative background */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-ember-pale to-transparent -z-10" />

      {/* Amazon Desktop Hero Multi-Card Carousel Strip */}
      <div className="max-w-[1500px] mx-auto px-4 pt-3 relative z-10">
        <div className="relative group">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute -left-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-black/40 hover:bg-black/70 flex items-center justify-center text-white text-3xl font-light rounded-r-md transition-all z-30 shadow-lg border border-white/20 focus:outline-none"
          >
            ‹
          </button>
          
          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute -right-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-black/40 hover:bg-black/70 flex items-center justify-center text-white text-3xl font-light rounded-l-md transition-all z-30 shadow-lg border border-white/20 focus:outline-none"
          >
            ›
          </button>

          {/* Horizontal Cards Scrollable Strip */}
          <div
            ref={scrollRef}
            className="flex items-stretch gap-5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 pt-1 px-1"
          >
            {/* Card 1: Free Delivery on your first order */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-gradient-to-b from-[#e85d04] to-[#d00000] text-white p-6 rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px] relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight mb-2">
                  Free delivery on your first order
                </h2>
                <p className="text-sm font-medium opacity-95">Try us, no delivery fee.</p>
              </div>
              <div className="my-auto py-4 relative flex justify-center">
                <div className="w-48 h-32 bg-white/10 rounded-sm flex items-center justify-center border border-white/20 shadow-inner">
                  <div className="text-center font-bold text-xs uppercase tracking-wider text-white/90 px-2">
                    📦 Storegrill Prime Express Delivery
                  </div>
                </div>
              </div>
              <div className="relative z-10 pt-2 border-t border-white/20">
                <span className="text-xs font-semibold opacity-90">New customers only. T&Cs apply.</span>
              </div>
            </div>

            {/* Card 2: Live / Video Creative Card (Porto v Man City style) */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-neutral-900 text-white rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px] relative overflow-hidden group/card">
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10" />
              <div className="absolute inset-0 opacity-80 group-hover/card:scale-105 transition-transform duration-700 bg-neutral-800">
                <div className="w-full h-full flex items-center justify-center text-white/20 font-bold text-lg">
                  ⚽ Live Match Stream
                </div>
              </div>
              <div className="relative z-20 p-5">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Prime Video</span>
                <h3 className="text-xl font-bold mt-2">Porto v Man City</h3>
                <p className="text-xs text-neutral-300 mt-0.5">From 18:30 PM</p>
              </div>
              <div className="relative z-20 p-5 flex items-center justify-between border-t border-white/10 bg-black/40">
                <span className="text-xs font-semibold text-neutral-300">Watch Live in HD</span>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">↺</span>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">🔇</span>
                </div>
              </div>
            </div>

            {/* Card 3: Shop deals ending soon (2x2 grid) */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-[#faedcd] text-text-primary p-5 rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px]">
              <div>
                <h3 className="text-xl font-extrabold text-text-primary tracking-tight mb-3">Shop deals ending soon</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {dealTiles.length > 0 ? (
                    dealTiles.map((tile: any, idx: number) => (
                      <a key={idx} href={tile.href} className="bg-white p-2 rounded-xs border border-neutral-300 hover:border-ember transition-colors group/tile">
                        <div className="w-full h-20 relative bg-neutral-100 rounded-xs overflow-hidden mb-1.5">
                          <img src={tile.image} alt={tile.title} className="object-cover w-full h-full group-hover/tile:scale-105 transition-transform" />
                        </div>
                        <span className="inline-block bg-ember text-white text-[9px] font-bold px-1.5 py-0.5 rounded-xs">
                          {idx === 0 ? '15% off' : idx === 1 ? '30% off' : idx === 2 ? '39% off' : '20% off'}
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-neutral-500 py-10 text-center">Loading daily deals...</div>
                  )}
                </div>
              </div>
              <div className="pt-3">
                <a href="/deals" className="text-xs font-bold text-ember hover:underline">See all deals →</a>
              </div>
            </div>

            {/* Card 4: Entertainment anywhere (Fire HD style) */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-gradient-to-br from-[#f77f00] to-[#d62828] text-white p-6 rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px]">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight mb-1">Entertainment anywhere</h3>
                <p className="text-xs font-medium text-white/90">Read, watch, play</p>
                <div className="mt-2 inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-xs text-xs font-bold">
                  fire <span className="text-blue-400 font-extrabold">HD 10</span>
                </div>
              </div>
              <div className="my-auto py-2 text-center font-bold text-sm text-white/80">
                📱 Tablet & Streaming Deals
              </div>
              <div>
                <a href="/deals" className="text-xs font-bold text-white underline hover:opacity-80">Shop Fire Tablets →</a>
              </div>
            </div>

            {/* Card 5: Second Chance Deal Days */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-[#e9edc9] text-text-primary p-6 rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px]">
              <div>
                <h3 className="text-2xl font-extrabold text-text-primary tracking-tight mb-1">Second Chance Deal Days</h3>
                <p className="text-xs font-medium text-neutral-700">1-10 Sept.</p>
              </div>
              <div className="my-auto py-4 bg-white/60 rounded-xs p-3 text-center border border-neutral-300">
                <span className="text-xs font-bold text-neutral-800">Certified Refurbished & Open Box Deals</span>
              </div>
              <div>
                <a href="/deals" className="text-xs font-bold text-ember hover:underline">Explore Second Chance →</a>
              </div>
            </div>

            {/* Card 6: Cosy Home Accessories */}
            <div className="w-[280px] sm:w-[320px] shrink-0 bg-[#d8f3dc] text-text-primary p-6 rounded-xs shadow-md flex flex-col justify-between snap-start min-h-[380px]">
              <div>
                <h3 className="text-2xl font-extrabold text-text-primary tracking-tight mb-1">Cosy home accessories</h3>
                <p className="text-xs font-medium text-neutral-700">Discover now</p>
              </div>
              <div className="my-auto py-4 bg-white/60 rounded-xs p-3 text-center border border-neutral-300">
                <span className="text-xs font-bold text-neutral-800">Interior Decor & Lighting</span>
              </div>
              <div>
                <a href="/categories" className="text-xs font-bold text-ember hover:underline">Shop Home →</a>
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