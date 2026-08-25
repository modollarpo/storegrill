'use client';

import Link from 'next/link';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'dark'
  | 'danger'
  | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  dark: 'btn-dark',
  danger: 'btn-danger',
  link: 'btn-link',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  xl: 'btn-xl',
};

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin',
        className
      )}
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    asChild,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  const classes = cn(VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
  const isDisabled = disabled || loading;

  if (asChild && !loading) {
    return (
      <span className={cn(classes, 'cursor-pointer')} role="presentation">
        {children}
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
});

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type IconButtonVariant = ButtonVariant | 'header-action';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
}

const ICON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  xs: 'w-7 h-7',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
  xl: 'w-11 h-11',
};

const VARIANT_ICON: Record<IconButtonVariant, string> = {
  primary:
    'bg-action-primary text-action-primary-fg hover:bg-action-primary-hover active:bg-action-primary-active',
  secondary:
    'bg-action-secondary text-text-inverse hover:bg-action-secondary-hover',
  outline:
    'bg-surface text-text-primary border border-border-strong hover:border-text-primary hover:bg-surface-sunken',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
  dark: 'bg-charcoal text-white hover:bg-charcoal-light',
  danger: 'bg-action-danger text-white hover:brightness-95',
  link: 'bg-transparent text-text-link underline-offset-4 hover:underline',
  'header-action':
    'flex-col items-center justify-center gap-0.5 p-1.5 w-auto h-auto rounded-xs border border-transparent hover:border-border-strong bg-transparent text-text-primary transition-all',
};

export const IconButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  IconButtonProps
>(function IconButton(
  { variant = 'ghost', size = 'md', label, icon, badge, className, href, id, ...rest },
  ref
) {
  const autoId = useId();
  const labelId = id || autoId;
  const isHeaderAction = variant === 'header-action';
  const base = isHeaderAction
    ? VARIANT_ICON['header-action']
    : cn(
        'inline-flex items-center justify-center rounded-xs shrink-0 relative select-none transition-all',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary',
        ICON_SIZE_CLASSES[size],
        VARIANT_ICON[variant]
      );
  const content = (
    <>
      <span className="relative inline-flex items-center justify-center">
        {icon}
        {badge}
      </span>
      {isHeaderAction && (
        <span id={labelId} className="text-[11px] font-bold tracking-tight hidden md:block">
          {label}
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        href={href}
        aria-label={label}
        aria-labelledby={label ? undefined : labelId}
        className={cn(base, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
      type="button"
      aria-label={label}
      aria-labelledby={label ? undefined : labelId}
      className={cn(base, className)}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
