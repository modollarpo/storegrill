import { StarRating } from '../StarRating';
import { cn } from '@/lib/utils';

export interface ReviewSummaryProps {
  average: number;
  total: number;
  distribution?: Array<{ stars: number; count: number }>;
  className?: string;
}

export function ReviewSummary({ average, total, distribution, className }: ReviewSummaryProps) {
  const hasDistribution = distribution && distribution.length > 0;

  return (
    <section className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)} aria-label="Rating summary" data-testid="review-summary">
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 p-6">
        <div className="flex flex-col items-center sm:items-start justify-center text-center sm:text-left shrink-0">
          <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Average rating</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold leading-none text-text-primary">{average > 0 ? average.toFixed(1) : '—'}</span>
            <span className="text-sm text-text-tertiary">/ 5</span>
          </div>
          <div className="mt-2">
            <StarRating rating={average} size="md" showCount={false} />
          </div>
          <p className="text-xs text-text-secondary mt-2">{total.toLocaleString()} {total === 1 ? 'rating' : 'ratings'} from verified shoppers</p>
        </div>

        {hasDistribution && (
          <div className="border-t sm:border-t-0 sm:border-l border-smoke-150 sm:pl-10 pt-5 sm:pt-0 self-center w-full min-w-0">
            <ul className="space-y-1.5" data-testid="review-distribution">
              {distribution.map(({ stars, count }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <li key={stars} className="flex items-center gap-3">
                    <span className="flex items-center gap-1 w-16 text-xs font-semibold text-text-secondary shrink-0">
                      {stars} <span className="text-action-primary">★</span>
                    </span>
                    <span className="flex-1 h-2.5 rounded-full bg-smoke-100 overflow-hidden" role="presentation">
                      <span
                        className="block h-full bg-action-primary rounded-full transition-all duration-slow"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-12 text-right text-xs font-semibold text-text-tertiary shrink-0">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export interface ReviewCardData {
  id: string;
  authorName: string;
  createdAt: string | Date;
  rating: number;
  title?: string;
  body?: string;
  verified?: boolean;
  images?: string[];
  vendorReply?: string;
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((i): i is string => typeof i === 'string');
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter((i): i is string => typeof i === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(value: string | Date, locale: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ReviewCard({ review, locale = 'en-US' }: { review: ReviewCardData; locale?: string }) {
  const images = parseImages(review.images);
  const initials = authorInitials(review.authorName);

  return (
    <article
      className="rounded-lg border border-smoke-150 bg-surface shadow-xs hover:shadow-sm transition-shadow p-5"
      data-testid="review-card"
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            'w-10 h-10 rounded-full grid place-items-center text-xs font-extrabold shrink-0',
            review.verified ? 'bg-feedback-success text-white ring-2 ring-feedback-success/20' : 'bg-smoke-200 text-smoke-700'
          )}
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-text-primary truncate">{review.authorName}</p>
            {review.verified && (
              <span className="inline-flex items-center gap-1 rounded-xs bg-feedback-success-bg text-feedback-success px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Verified purchase
              </span>
            )}
          </div>
          <p className="text-2xs text-text-tertiary mt-0.5">Reviewed on {formatDate(review.createdAt, locale)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating rating={review.rating} showCount={false} />
          <span className="text-2xs font-semibold text-text-tertiary">{review.rating}.0 / 5</span>
        </div>
      </header>

      {review.title && (
        <h4 className="mt-3 text-sm font-bold text-text-primary">{review.title}</h4>
      )}

      {review.body && (
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{review.body}</p>
      )}

      {images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto" role="list" aria-label="Customer photos">
          {images.slice(0, 5).map((src, i) => (
            <span
              key={src + i}
              role="listitem"
              className="relative w-20 h-20 rounded-md overflow-hidden border border-smoke-150 bg-surface-sunken shrink-0 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Customer photo ${i + 1}`} loading="lazy" className="object-cover w-full h-full transition-transform duration-normal group-hover:scale-105" />
            </span>
          ))}
          {images.length > 5 && (
            <span role="listitem" className="relative w-20 h-20 rounded-md overflow-hidden border border-smoke-150 bg-smoke-100 grid place-items-center shrink-0">
              <span className="text-xs font-extrabold text-smoke-700">+{images.length - 5}</span>
            </span>
          )}
        </div>
      )}

      {review.vendorReply && (
        <blockquote className="mt-4 rounded-md bg-smoke-50 border-l-2 border-smoke-400 p-3">
          <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Seller response</p>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">{review.vendorReply}</p>
        </blockquote>
      )}
    </article>
  );
}