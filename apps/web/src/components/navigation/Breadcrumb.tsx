import Link from 'next/link';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  regionKey: string;
  className?: string;
}

export function Breadcrumb({ items, regionKey, className }: BreadcrumbProps) {
  const all = [{ name: 'Home', path: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn('py-3', className)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(all, regionKey)) }}
      />
      <ol className="flex items-center gap-1 text-2xs flex-wrap">
        <MobileFirst item={all[0]} />
        {all.length > 2 && (
          <li aria-hidden="true" className="hidden max-sm:inline px-0.5 text-smoke-300">…</li>
        )}
        {all.slice(1, -1).map((item, i) => (
          <li key={`${item.path}-${i}`} className={cn('flex items-center gap-1', i > 0 && 'max-md:hidden')}>
            <Chevron />
            <Link href={item.path} className="inline-block py-1.5 -my-1.5 text-tealink hover:text-tealink-hover hover:underline truncate max-w-[16ch]">
              {item.name}
            </Link>
          </li>
        ))}
        {all.length > 1 && (
          <li className="flex items-center gap-1 min-md:hidden" aria-hidden="true" />
        )}
        {all.length > 1 && (
          <li className="flex items-center gap-1">
            <span className={cn(all.length > 2 ? 'max-md:hidden' : '', 'max-sm:hidden')} aria-hidden="true"><Chevron /></span>
            <span className="text-smoke-500 font-medium truncate max-w-[28ch]" aria-current="page">{all[all.length - 1].name}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}

function MobileFirst({ item }: { item: BreadcrumbItem }) {
  return (
    <li className="flex items-center">
      <Link href={item.path} className="text-tealink hover:text-tealink-hover hover:underline">
        {item.name}
      </Link>
    </li>
  );
}

function Chevron() {
  return (
    <svg className="w-3 h-3 text-smoke-300 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
