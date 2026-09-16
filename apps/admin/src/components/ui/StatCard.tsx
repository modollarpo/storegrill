import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  href?: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, href, accent = false, className }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'group relative rounded-xl border p-5 transition-all',
        accent
          ? 'bg-gradient-to-br from-surface-900 to-surface-950 text-white border-surface-800 shadow-lg'
          : 'bg-white border-surface-200 shadow-xs hover:border-brand-400 hover:shadow-md',
        href && 'cursor-pointer',
        className,
      )}
    >
      {icon && (
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              accent
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-surface-100 text-surface-500 group-hover:bg-brand-50 group-hover:text-brand-600',
            )}
          >
            {icon}
          </div>
          {href && (
            <svg
              className={cn(
                'w-4 h-4 opacity-0 -translate-x-1 transition-all',
                accent ? 'text-white/50 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-white/80' : 'text-surface-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-brand-500',
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      )}
      <p className={cn('text-2xl font-extrabold tabular-nums tracking-tight', accent ? 'text-white' : 'text-surface-900')}>
        {value}
      </p>
      <p className={cn('text-xs font-medium mt-1', accent ? 'text-surface-300' : 'text-surface-500')}>
        {label}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl">{inner}</Link>;
  }
  return inner;
}
