'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  isSaved: boolean;
  onClick: (e: React.MouseEvent) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function WishlistButton({ isSaved, onClick, label, className, size = 'md' }: WishlistButtonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevSaved = useRef(isSaved);

  useEffect(() => {
    if (isSaved && !prevSaved.current && svgRef.current) {
      svgRef.current.classList.add('animate-heart-pop');
      const t = setTimeout(() => svgRef.current?.classList.remove('animate-heart-pop'), 500);
      return () => clearTimeout(t);
    }
    prevSaved.current = isSaved;
  }, [isSaved]);

  const sizeClass = size === 'sm'
    ? 'w-8 h-8'
    : 'w-10 h-10';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove from wishlist${label ? ` — ${label}` : ''}` : `Save to wishlist${label ? ` — ${label}` : ''}`}
      onClick={onClick}
      className={cn(
        'grid place-items-center rounded-full bg-surface-raised/90 backdrop-blur-sm border shadow-sm transition-colors',
        isSaved
          ? 'border-action-primary text-action-primary bg-action-primary/5'
          : 'border-border text-text-tertiary hover:border-action-primary hover:text-action-primary',
        sizeClass,
        className
      )}
    >
      <svg
        ref={svgRef}
        className={iconSize}
        viewBox="0 0 24 24"
        fill={isSaved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
