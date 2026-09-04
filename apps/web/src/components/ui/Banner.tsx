'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type BannerVariant = 'default' | 'ember' | 'info' | 'success' | 'dark';
export type BannerSize = 'sm' | 'md' | 'lg';

export interface BannerProps extends React.HTMLAttributes<HTMLElement> {
  variant?: BannerVariant;
  size?: BannerSize;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

const VARIANT_CLASSES: Record<BannerVariant, string> = {
  default: 'bg-surface border border-border',
  ember: 'bg-gradient-to-r from-ember-deep to-ember text-white border-none',
  info: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100',
  success: 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100',
  dark: 'bg-charcoal text-white border-none',
};

const SIZE_CLASSES: Record<BannerSize, string> = {
  sm: 'p-5 min-md:p-6',
  md: 'p-6 min-md:p-8',
  lg: 'p-8 min-md:p-10',
};

export const Banner = forwardRef<HTMLElement, BannerProps>(function Banner(
  {
    variant = 'default',
    size = 'md',
    title,
    description,
    eyebrow,
    actions,
    children,
    className,
    ...rest
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={cn(
        'rounded-xl shadow-sm overflow-hidden',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {eyebrow && (
        <p className={cn(
          'text-xs font-bold uppercase tracking-wider mb-2',
          variant === 'default' || variant === 'info' || variant === 'success'
            ? 'text-smoke-600'
            : 'text-white/80',
        )}>
          {eyebrow}
        </p>
      )}
      <h3 className="text-base font-extrabold text-inherit">
        {title}
      </h3>
      {description && (
        <p className={cn(
          variant === 'default' || variant === 'info' || variant === 'success'
            ? 'text-text-secondary'
            : 'text-white/80',
        )}>
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
      {children && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {children}
        </div>
      )}
    </section>
  );
});
