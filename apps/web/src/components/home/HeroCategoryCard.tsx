'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HeroCategorySlide } from './hero-category-data';

interface HeroCategoryCardProps {
  slide: HeroCategorySlide;
  className?: string;
}

export function HeroCategoryCard({ slide, className }: HeroCategoryCardProps) {
  const { theme } = slide;

  return (
    <Link
      href={slide.href}
      className={cn(
        'group relative flex flex-col justify-between h-[380px] md:h-[410px] lg:h-[430px]',
        'rounded-2xl overflow-hidden cursor-pointer border border-black/5',
        'transition-shadow duration-300 hover:shadow-xl',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
      style={{ backgroundColor: theme.bg, color: theme.text }}
      aria-label={`${slide.eyebrow}: ${slide.title}`}
    >
      {/* Badge */}
      {slide.badge ? (
        <div className="absolute top-5 left-5 z-20">
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: theme.badgeBg || theme.accent,
              color: theme.badgeText || theme.bg,
            }}
          >
            {slide.badge}
          </span>
        </div>
      ) : null}

      {/* Text content — top half */}
      <div className="relative z-10 flex flex-col gap-2 px-6 pt-6 md:px-7 md:pt-7">
        <span
          className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.14em] opacity-70"
        >
          {slide.eyebrow}
        </span>
        <h2 className="text-[26px] md:text-[32px] lg:text-[38px] font-extrabold leading-[1.08] tracking-tight max-w-[260px]">
          {slide.title}
        </h2>
        <p className="text-[13px] md:text-[14px] leading-relaxed opacity-75 max-w-[220px] mt-1">
          {slide.description}
        </p>
      </div>

      {/* CTA — bottom left */}
      <div className="relative z-10 px-6 pb-6 md:px-7 md:pb-7">
        <span
          className="inline-flex items-center gap-2 text-[13px] md:text-[14px] font-semibold group-hover:gap-3 transition-all duration-200"
          style={{ color: theme.accent }}
        >
          {slide.cta}
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>

      {/* Product image — bottom right, overlapping */}
      <div className="absolute bottom-0 right-0 w-[55%] h-[65%] pointer-events-none z-0">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          sizes="(max-width: 768px) 55vw, 280px"
          className="object-contain object-bottom-right mix-blend-multiply opacity-90 group-hover:scale-[1.03] transition-transform duration-500 ease-out"
        />
      </div>

      {/* Subtle accent shape */}
      <div
        className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: theme.accent }}
        aria-hidden="true"
      />
    </Link>
  );
}
