import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center text-surface-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-surface-800">{title}</h3>
      {body && <p className="text-xs text-surface-500 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
