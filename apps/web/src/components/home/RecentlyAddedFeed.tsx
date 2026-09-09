'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from '@/components/providers/RegionContext';
import { CategoryRowGrid } from '@/components/commerce/grid';
import { getRecentCategories } from '@/lib/api-client';
import { buildCategoryCards, rowsFromCards } from '@/lib/home-content-build';
import type { HomeSectionItem } from '@/lib/home-content-build';

const RECENT_MAX_PAGES = 25;

export function RecentlyAddedFeed({
  regionKey,
  language,
  initialRows,
  hasMore,
  nextOffset,
}: {
  regionKey: string;
  language: string;
  initialRows: HomeSectionItem[][];
  hasMore: boolean;
  nextOffset: number;
}) {
  const t = useTranslations();
  const [rows, setRows] = useState<HomeSectionItem[][]>(initialRows ?? []);
  const [more, setMore] = useState(hasMore);
  const [next, setNext] = useState(nextOffset);
  const [loading, setLoading] = useState(false);
  const [failed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || failed) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    try {
      const page = await getRecentCategories(regionKey, next, { signal: controller.signal });
      if (page.categories.length === 0) {
        setMore(false);
        return;
      }
      const cards = buildCategoryCards(page.categories, language).filter(card => card.tiles.length > 0);
      setRows(current => [...current, ...rowsFromCards(cards)]);
      const loaded = next + page.categories.length;
      setNext(loaded);
      setMore(page.hasMore && loaded < RECENT_MAX_PAGES * 4);
    } finally {
      setLoading(false);
    }
  }, [language, loading, failed, next, regionKey]);

  useEffect(() => {
    if (!more || loading || failed) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          clearTimeout(timer);
          timer = window.setTimeout(() => void loadMore(), 250);
        }
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(sentinel);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      controllerRef.current?.abort();
    };
  }, [more, loading, failed, loadMore]);

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="home-recently-added" className="mt-8">
      <h2 id="home-recently-added" className="px-1 text-lg md:text-xl font-bold text-text-primary mb-3">
        {t('newReleases')}
      </h2>
      {rows.map((row, rowIndex) => (
        <CategoryRowGrid key={rowIndex} items={row} />
      ))}
      {loading ? (
        <div role="status" aria-label={t('homeLoading')} className="flex items-center justify-center py-8">
          <Image
            src="/icons/splash-spinner.svg"
            width={64}
            height={64}
            alt=""
            unoptimized
            aria-hidden="true"
            priority={false}
          />
        </div>
      ) : null}
      {failed ? <p className="py-6 text-center text-sm text-text-tertiary">{t('homeError')}</p> : null}
      {!more && rows.length > 0 ? (
        <div className="mt-4 flex justify-center">
          <Link
            href="/categories"
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken hover:border-text-primary"
          >
            {t('viewAll')}
          </Link>
        </div>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}