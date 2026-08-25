'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';

const KEY = 'storegrill-recently-viewed';
const MAX_ITEMS = 8;

interface RecentItem {
  slug: string;
  name: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
  thumbnail?: string;
}

export function recordRecentlyViewed(item: RecentItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const next = [item, ...existing.filter(e => e.slug !== item.slug)].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('storegrill:recently-viewed'));
  } catch {
    // corrupted storage is not worth blocking the page over
  }
}

export function TrackRecentlyViewed({ item }: { item: RecentItem }) {
  useEffect(() => {
    recordRecentlyViewed(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  return null;
}

export function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    function load() {
      try {
        setItems(JSON.parse(localStorage.getItem(KEY) || '[]'));
      } catch {
        setItems([]);
      }
    }
    load();
    window.addEventListener('storegrill:recently-viewed', load);
    return () => window.removeEventListener('storegrill:recently-viewed', load);
  }, []);

  const visible = (items || []).filter(i => i.slug !== currentSlug);
  if (!items || visible.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-displaysm font-semibold text-charcoal mb-4">Recently viewed</h2>
      <ul className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" role="list">
        {visible.map(item => (
          <li key={item.slug} className="card p-3 shrink-0 w-40 hover:border-charcoal transition-colors">
            <Link href={`/products/${item.slug}`} className="block">
              <span className="block w-full aspect-square rounded-sm bg-smoke-100 overflow-hidden mb-2">
                {item.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : null}
              </span>
              <span className="block text-xs font-semibold text-charcoal line-clamp-2 leading-snug">{item.name}</span>
              <PriceDisplay amountMinorUnits={item.unitPriceMinorUnits} currencyCode={item.currencyCode} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
