import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
  right?: ReactNode;
  count?: string;
}

export function Toolbar({ children, className, right, count }: ToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {children}
      {count !== undefined && (
        <span className="text-xs text-surface-400 font-medium tabular-nums">{count}</span>
      )}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
