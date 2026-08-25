import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
  className?: string;
}

export function Pagination({ page, totalPages, makeHref, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = windowedPages(page, totalPages);

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1 py-8', className)}>
      <PageArrow href={page > 1 ? makeHref(page - 1) : null} label="Previous page">← Prev</PageArrow>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-text-tertiary select-none" aria-hidden="true">…</span>
        ) : (
          <Link
            key={p}
            href={makeHref(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'min-w-10 h-10 px-2 inline-flex items-center justify-center rounded-full text-sm font-bold border transition-colors shadow-sm',
              p === page
                ? 'bg-action-primary text-action-primary-fg border-action-primary'
                : 'bg-surface border-border text-text-primary hover:border-action-primary hover:text-action-primary hover:bg-surface-sunken'
            )}
          >
            {p}
          </Link>
        )
      )}
      <PageArrow href={page < totalPages ? makeHref(page + 1) : null} label="Next page">Next →</PageArrow>
    </nav>
  );
}

function PageArrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return <span className="px-4 h-10 inline-flex items-center text-sm font-bold text-text-tertiary cursor-not-allowed">{children}</span>;
  }
  return (
    <Link href={href} aria-label={label} className="px-4 h-10 inline-flex items-center rounded-full text-sm font-bold border border-border bg-surface text-text-primary shadow-sm hover:border-action-primary hover:text-action-primary hover:bg-surface-sunken transition-colors">
      {children}
    </Link>
  );
}

function windowedPages(current: number, total: number): Array<number | '…'> {
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  const pages: Array<number | '…'> = [1];
  const leftGap = range.length > 0 && range[0] > 2;
  const rightGap = range.length > 0 && range[range.length - 1] < total - 1;

  if (leftGap) pages.push('…');
  pages.push(...range);
  if (rightGap) pages.push('…');
  if (total > 1) pages.push(total);
  return [...new Map(pages.map(p => [String(p), p])).values()];
}
