import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary: 'bg-surface-900 text-white hover:bg-surface-800 shadow-xs',
  secondary: 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 shadow-xs',
  ghost: 'text-surface-600 hover:bg-surface-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
  dangerOutline: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-xs',
} as const;

const SIZES = {
  sm: 'h-7 px-2.5 text-[11px] rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-10 px-5 text-sm rounded-lg',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      {children}
    </button>
  );
}
