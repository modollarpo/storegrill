'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from '@/components/providers/RegionContext';
import { CategoryRowGrid } from '@/components/commerce/grid';
import { getRecentCategories } from '@/lib/api-client';
import { buildCategoryCards, rowsFromCards } from '@/lib/home-content-build';
import type { HomeSectionItem } from '@/lib/home-content-build';

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
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || failed) return;
    setLoading(true);
    const page = await getRecentCategories(regionKey, next);
    setLoading(false);
    if (page.categories.length === 0) {
      setMore(false);
      return;
    }
    const cards = buildCategoryCards(page.categories, language).filter(card => card.tiles.length > 0);
    setRows(current => [...current, ...rowsFromCards(cards)]);
    setNext(current => current + page.categories.length);
    setMore(page.hasMore);
  }, [language, loading, failed, next, regionKey]);

  useEffect(() => {
    if (!more || loading || failed) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
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
      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}