import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  trend?: { dir: 'up' | 'down' | 'flat'; pct?: number; note?: string };
  tone?: 'default' | 'warning' | 'danger';
  href?: string;
}

export function StatCard({ label, value, trend, tone = 'default', href }: StatCardProps) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn(
        'mt-1.5 text-2xl font-bold [font-variant-numeric:tabular-nums] tracking-tight',
        tone === 'default' && 'text-slate-900',
        tone === 'warning' && 'text-amber-600',
        tone === 'danger' && 'text-rose-600'
      )}>
        {value}
      </p>
      {trend && (
        <p className={cn(
          'mt-1 text-[11px] font-semibold',
          trend.dir === 'up' && 'text-emerald-600',
          trend.dir === 'down' && 'text-rose-600',
          trend.dir === 'flat' && 'text-slate-400'
        )}>
          {trend.dir === 'up' && '↑'}
          {trend.dir === 'down' && '↓'}
          {trend.dir === 'flat' && '—'}
          {trend.pct !== undefined && ` ${Math.abs(trend.pct)}%`}
          {trend.note && ` ${trend.note}`}
        </p>
      )}
    </>
  );

  const cls = cn(
    'block bg-surface-raised rounded-lg border p-4 transition-all',
    href
      ? 'border-slate-200 hover:border-indigo-300 hover:shadow-card cursor-pointer'
      : 'border-slate-200 shadow-card',
    tone === 'danger' && 'border-rose-200 bg-rose-50/40',
    tone === 'warning' && 'border-amber-200 bg-amber-50/40'
  );

  return href ? (
    <a href={href} className={cls}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
