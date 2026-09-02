'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ReviewCard, ReviewSummary, type ReviewCardData } from './Reviews';
import { cn } from '@/lib/utils';

interface ReviewsTabProps {
  productId: string;
  initial: ReviewCardData[];
  average: number;
  total: number;
  distribution: Array<{ stars: number; count: number }>;
  locale?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface QueryResult {
  reviews?: Array<Record<string, unknown> & { id?: string }>;
  stats?: { average?: number; total?: number; distribution?: Array<{ rating: number; count: number }> };
  pagination?: { totalPages: number; total: number };
}

type SortMode = 'recent' | 'highest' | 'lowest';

const STAR_VALUES = [5, 4, 3, 2, 1];

function toReviewData(r: Record<string, unknown>, fallbackAuthor = 'Verified Storegrill customer'): ReviewCardData | null {
  const id = String(r.id ?? '');
  if (!id) return null;
  let images: string[] = [];
  const raw = r.images;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) images = parsed.filter((i): i is string => typeof i === 'string');
    } catch {
      images = [];
    }
  } else if (Array.isArray(raw)) {
    images = raw.filter((i): i is string => typeof i === 'string');
  }
  return {
    id,
    authorName: String((r.user as Record<string, unknown> | undefined)?.name || (r.authorName as string | undefined) || fallbackAuthor),
    createdAt: String(r.createdAt ?? ''),
    rating: Number(r.rating ?? 0),
    title: r.title ? String(r.title) : undefined,
    body: r.body ? String(r.body) : undefined,
    verified: Boolean(r.verified),
    images,
    vendorReply: r.vendorReply ? String(r.vendorReply) : undefined,
  };
}

export function ReviewsTab({ productId, initial, average, total, distribution, locale = 'en-US' }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<ReviewCardData[]>(initial);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filterStars, setFilterStars] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  useEffect(() => {
    setReviews(initial);
    setPage(1);
    setTotalPages(1);
    setTotalCount(total);
    setLoadError(false);
  }, [productId, initial, total]);

  const loadMore = useCallback(async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`${API_BASE}/api/v1/reviews/product/${encodeURIComponent(productId)}?page=${page + 1}&limit=10`);
      const data = (await res.json()) as QueryResult;
      const next = (data.reviews ?? []).map(r => toReviewData(r)).filter((r): r is ReviewCardData => Boolean(r));
      setReviews(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...next.filter(r => !seen.has(r.id))];
      });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? totalCount);
      setPage(p => p + 1);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId, page, loading, totalPages, totalCount]);

  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sortMode === 'highest') list.sort((a, b) => b.rating - a.rating);
    else if (sortMode === 'lowest') list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [reviews, sortMode]);

  const visible = useMemo(() => {
    if (!filterStars) return sorted;
    return sorted.filter(r => Math.round(r.rating) === filterStars);
  }, [sorted, filterStars]);

  const distByStar = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of distribution) map.set(d.stars, d.count);
    return map;
  }, [distribution]);

  const hasMore = page < totalPages;

  return (
    <div className="space-y-6" data-testid="reviews-tab">
      <ReviewSummary average={average} total={totalCount} distribution={distribution} />

      <div className="flex flex-col gap-3 rounded-xl border border-smoke-150 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="reviews-toolbar">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-text-secondary">Filter</span>
          {STAR_VALUES.map(stars => {
            const active = filterStars === stars;
            const count = distByStar.get(stars) ?? 0;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setFilterStars(active ? null : stars)}
                className={cn(
                  'inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-bold transition-colors',
                  active
                    ? 'bg-ember text-white shadow-sm'
                    : 'bg-white text-text-secondary border border-border hover:border-ember'
                )}
                aria-pressed={active}
                aria-label={`${stars} star reviews`}
              >
                {stars}<span className="opacity-75">★</span>
                <span className={cn('text-[10px] font-extrabold', active ? 'text-white/80' : 'text-text-tertiary')}>{count}</span>
              </button>
            );
          })}
          {filterStars && (
            <button
              type="button"
              onClick={() => setFilterStars(null)}
              className="h-8 px-2.5 rounded-md text-xs font-bold text-text-tertiary hover:text-text-primary hover:bg-smoke-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="reviews-sort" className="text-xs font-bold text-text-secondary">
            Sort
          </label>
          <select
            id="reviews-sort"
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="h-8 rounded-md border border-border bg-white px-2 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <option value="recent">Most recent</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-smoke-200 bg-surface-sunken p-10 text-center" data-testid="reviews-empty">
          <div className="mx-auto w-12 h-12 rounded-full bg-smoke-100 grid place-items-center text-2xl">★</div>
          <h3 className="mt-4 text-base font-bold text-text-primary">No reviews yet</h3>
          <p className="mt-1 mx-auto max-w-sm text-sm text-text-secondary">
            This product hasn&apos;t been reviewed. Purchase it securely and be the first to share your experience.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">No reviews at this rating yet.</p>
      ) : (
        <div className="space-y-3" data-testid="reviews-list">
          {visible.map(r => (
            <ReviewCard key={r.id} review={r} locale={locale} />
          ))}
        </div>
      )}

      {filterStars === null && totalCount > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-smoke-100 pt-4">
          <p className="text-xs text-text-tertiary">
            {visible.length.toLocaleString()} {visible.length === 1 ? 'review' : 'reviews'} shown of {totalCount.toLocaleString()}
          </p>
          {hasMore ? (
            <button type="button" onClick={loadMore} disabled={loading} className="btn btn-outline btn-sm">
              {loading ? 'Loading more…' : 'Load more reviews'}
            </button>
          ) : (
            <p className="text-xs text-text-tertiary">You&apos;ve reached the end of reviews.</p>
          )}
        </div>
      )}

      {loadError && (
        <p role="alert" className="text-sm font-semibold text-feedback-danger">
          Could not load more reviews. Please try again.
        </p>
      )}

      <div className="rounded-xl border border-smoke-150 bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="reviews-cta">
        <div>
          <p className="text-sm font-bold text-text-primary">Share your experience</p>
          <p className="text-sm text-text-secondary mt-0.5">
            Reviews are written by verified purchasers after delivery. Sign in to your account to submit one.
          </p>
        </div>
        <Link href="/account" className="btn btn-outline btn-sm shrink-0">
          Write a review
        </Link>
      </div>
    </div>
  );
}