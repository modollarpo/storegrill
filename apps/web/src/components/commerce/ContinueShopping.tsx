'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const KEY = 'storegrill-last-category';

export function recordLastCategory(categorySlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, categorySlug);
  } catch {}
}

export function ContinueShopping({ className }: { className?: string }) {
  const [lastCategory, setLastCategory] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastCategory(localStorage.getItem(KEY));
    } catch {}
  }, []);

  if (!lastCategory) return null;

  const categoryLabel = lastCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <section className={cn('py-4', className)}>
      <Link
        href={`/categories/${lastCategory}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-action-primary hover:underline"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Continue shopping in {categoryLabel}
      </Link>
    </section>
  );
}
