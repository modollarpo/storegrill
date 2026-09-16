import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const BADGE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200/60',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200/60',
  PAID: 'bg-blue-50 text-blue-700 border-blue-200/60',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200/60',
  PENDING: 'bg-surface-50 text-surface-600 border-surface-200',
  PENDING_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  DRAFT: 'bg-surface-50 text-surface-500 border-surface-200',
  INACTIVE: 'bg-surface-50 text-surface-500 border-surface-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200/60',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200/60',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200/60',
  REJECTED: 'bg-red-50 text-red-700 border-red-200/60',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200/60',
  ERROR: 'bg-red-50 text-red-700 border-red-200/60',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200/60',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200/60',
};

interface BadgeProps {
  children: ReactNode;
  status?: string;
  className?: string;
}

export function Badge({ children, status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap',
        status ? BADGE_STYLES[status] ?? 'bg-surface-50 text-surface-600 border-surface-200' : '',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge status={status}>{status.replace(/_/g, ' ')}</Badge>;
}
