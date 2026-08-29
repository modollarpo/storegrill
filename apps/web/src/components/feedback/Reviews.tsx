import { StarRating } from '../StarRating';
import { cn } from '@/lib/utils';

export interface ReviewSummaryProps {
  average: number;
  total: number;
  distribution?: Array<{ stars: number; count: number }>;
  className?: string;
}

export function ReviewSummary({ average, total, distribution, className }: ReviewSummaryProps) {
  const dist =
    distribution ??
    [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: Math.round(total * (stars === Math.round(average) ? 0.5 : 0.5 / 4)),
    }));

  return (
    <section aria-label="Rating summary" className={cn('flex flex-col sm:flex-row gap-6 sm:gap-10', className)} data-testid="review-summary">
      <div className="text-center sm:text-left shrink-0">
        <p className="text-sm text-charcoal font-medium">Customer reviews</p>
        <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
          <StarRating rating={average} size="md" showCount={false} />
          <span className="text-base font-semibold">{average > 0 ? average.toFixed(1) : '—'}</span>
        </div>
        <p className="text-2xs text-smoke-500 mt-1">{total.toLocaleString()} global ratings</p>
      </div>
      <ul className="flex-1 space-y-1 min-w-[220px]">
        {dist.map(({ stars, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={stars} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-tealink hover:underline cursor-pointer whitespace-nowrap">{stars} star</span>
              <span className="flex-1 h-3.5 rounded-xs bg-smoke-100 overflow-hidden border border-smoke-150" role="presentation">
                <span className="block h-full bg-action-primary rounded-xs transition-all duration-slow" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 text-right text-tealink hover:underline cursor-pointer whitespace-nowrap">{pct}%</span>
            </li>
          );
        })}
      </ul>
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
  helpfulCount?: number;
  vendorReply?: string;
}

export function ReviewCard({ review, locale = 'en-US' }: { review: ReviewCardData; locale?: string }) {
  const date = new Date(review.createdAt);
  const initials = review.authorName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="py-4 border-b border-smoke-100 last:border-b-0" data-testid="review-card">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-smoke-150 grid place-items-center text-2xs font-bold text-smoke-600 shrink-0" aria-hidden="true">
          {initials}
        </span>
        <p className="text-xs font-medium text-charcoal">{review.authorName}</p>
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <StarRating rating={review.rating} showCount={false} />
        {review.title && <h4 className="text-sm font-semibold text-charcoal">{review.title}</h4>}
      </div>
      <p className="text-2xs text-smoke-400 mt-1">
        Reviewed on{' '}
        {new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date)}
        {review.verified && <span className="ml-2 text-feedback-success font-bold">Verified Purchase</span>}
      </p>
      {review.body && (
        <p className="mt-2 text-sm text-smoke-600 leading-relaxed line-clamp-3">{review.body}</p>
      )}
      {review.images && review.images.length > 0 && (
        <div className="mt-2.5 flex gap-2">
          {review.images.slice(0, 4).map(src => (
            <span key={src} className="relative w-16 h-16 rounded-sm overflow-hidden border border-smoke-150 bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="object-cover w-full h-full" />
            </span>
          ))}
        </div>
      )}
      {typeof review.helpfulCount === 'number' && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="btn btn-outline btn-xs">Helpful</button>
          <span className="text-2xs text-smoke-500">{review.helpfulCount.toLocaleString()} people found this helpful</span>
        </div>
      )}
      {review.vendorReply && (
        <blockquote className="mt-3 ml-6 pl-4 border-l-2 border-smoke-200">
          <p className="text-2xs font-bold text-charcoal mb-1">Response from vendor</p>
          <p className="text-xs text-smoke-600">{review.vendorReply}</p>
        </blockquote>
      )}
    </article>
  );
}
