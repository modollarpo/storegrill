'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, defaultChecked, onChange, label, description, disabled, className },
  ref
) {
  const id = useId();
  const isControlled = checked !== undefined;

  function toggle() {
    if (disabled) return;
    if (!isControlled && ref && 'current' in ref && ref.current) {
      ref.current.setAttribute('aria-checked', ref.current.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
    }
    onChange?.(!(checked ?? defaultChecked ?? false));
  }

  return (
    <span className={cn('inline-flex items-center justify-between gap-3', disabled && 'opacity-50', className)}>
      <span>
        <label htmlFor={id} className={cn('block text-xs font-medium text-charcoal cursor-pointer', disabled && 'cursor-not-allowed')}>
          {label}
        </label>
        {description && <span className="block text-2xs text-smoke-500 mt-0.5">{description}</span>}
      </span>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={isControlled ? checked : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        data-defaultchecked={defaultChecked}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-fast shrink-0',
          'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,122,28,0.35)]'
        )}
        style={{ backgroundColor: isControlled ? (checked ? 'var(--color-action-primary)' : 'var(--color-border-strong)') : undefined }}
      >
        <SwitchThumb checked={checked} defaultChecked={defaultChecked} />
      </button>
    </span>
  );
});

function SwitchThumb({ checked, defaultChecked }: { checked?: boolean; defaultChecked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block w-4 h-4 rounded-full bg-surface-raised shadow-sm transition-transform duration-fast',
        (checked ?? defaultChecked) ? 'translate-x-[1.15rem]' : 'translate-x-0.5'
      )}
    />
  );
}
