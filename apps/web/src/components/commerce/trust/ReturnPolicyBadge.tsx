import { cn } from '@/lib/utils';

interface ReturnPolicyBadgeProps {
  days?: number;
  className?: string;
}

export function ReturnPolicyBadge({ days = 30, className }: ReturnPolicyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-text-secondary',
        className
      )}
    >
      <svg className="w-3.5 h-3.5 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
      {days}-day returns
    </span>
  );
}
