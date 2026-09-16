import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
}

export function StatCard({ label, value, icon, href, className }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'group relative rounded-xl border bg-white border-surface-200 shadow-xs p-5 transition-all hover:border-brand-400 hover:shadow-md',
        href && 'cursor-pointer',
        className,
      )}
    >
      {icon && (
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-lg bg-surface-100 text-surface-500 flex items-center justify-center shrink-0 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
            {icon}
          </div>
          {href && (
            <svg
              className="w-4 h-4 opacity-0 -translate-x-1 transition-all text-surface-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-brand-500"
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
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-surface-900">{value}</p>
      <p className="text-xs font-medium mt-1 text-surface-500">{label}</p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl">{inner}</Link>;
  }
  return inner;
}