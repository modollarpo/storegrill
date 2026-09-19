'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { HeroCategoryCard } from './HeroCategoryCard';
import { HERO_CATEGORY_SLIDES, type HeroCategorySlide } from './hero-category-data';

interface HeroCategoryCarouselProps {
  slides?: HeroCategorySlide[];
  className?: string;
}

function CarouselArrow({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'hidden md:flex items-center justify-center',
        'w-11 h-11 rounded-full',
        'bg-white/95 hover:bg-white text-[var(--hc-navy)]',
        'shadow-md hover:shadow-lg transition-all duration-200',
        'disabled:opacity-0 disabled:pointer-events-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hc-teal)]',
        direction === 'left' ? '-left-5' : '-right-5',
      )}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  );
}

export function HeroCategoryCarousel({
  slides = HERO_CATEGORY_SLIDES,
  className,
}: HeroCategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const epsilon = 2;
    setCanScrollLeft(el.scrollLeft > epsilon);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - epsilon);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByCard = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(':scope > *')?.offsetWidth ?? 300;
    const gap = 16;
    const amount = direction === 'left' ? -(cardWidth + gap) : cardWidth + gap;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  return (
    <section
      className={cn('relative', className)}
      aria-label="Shop by category"
    >
      {/* Section header */}
      <div className="flex items-end justify-between mb-5 px-1">
        <div>
          <h2 className="text-[22px] md:text-[26px] font-extrabold tracking-tight text-[var(--hc-navy)]">
            Shop by Category
          </h2>
          <p className="text-[13px] md:text-[14px] text-[var(--hc-slate)] mt-1 opacity-70">
            Explore what Storegrill has to offer
          </p>
        </div>

        {/* Arrow controls — desktop */}
        <div className="hidden md:flex items-center gap-2">
          <CarouselArrow
            direction="left"
            onClick={() => scrollByCard('left')}
            disabled={!canScrollLeft}
            label="Scroll left"
          />
          <CarouselArrow
            direction="right"
            onClick={() => scrollByCard('right')}
            disabled={!canScrollRight}
            label="Scroll right"
          />
        </div>
      </div>

      {/* Scrollable card strip */}
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory',
          'pb-2 -mx-1 px-1',
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label="Category carousel"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollByCard('left');
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollByCard('right');
          }
        }}
      >
        {slides.map(slide => (
          <div
            key={slide.id}
            className="snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[calc((100%-32px)/3)] lg:w-[calc((100%-48px)/4)] xl:w-[calc((100%-64px)/5)]"
            role="group"
            aria-roledescription="slide"
            aria-label={slide.eyebrow}
          >
            <HeroCategoryCard slide={slide} className="h-full" />
          </div>
        ))}
      </div>

      {/* Mobile scroll hint — shows partial next card */}
      <div className="md:hidden flex justify-center mt-4 gap-1.5" aria-hidden="true">
        {slides.map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--hc-navy)]/20" />
        ))}
      </div>
    </section>
  );
}
