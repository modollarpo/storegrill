'use client';

import { forwardRef, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { options, value, defaultValue, onChange, label, hint, error, required, placeholder = 'Select…', disabled, id: idProp, name, className },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;
  const selected = options.find(o => o.value === current);

  function commit(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  }

  function onDocumentClick(e: MouseEvent) {
    if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(Math.max(0, options.findIndex(o => o.value === current)));
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const option = options[activeIndex];
      if (option && !option.disabled) commit(option.value);
    } else if (e.key.length === 1) {
      const term = e.key.toLowerCase();
      const idx = options.findIndex(o => !o.disabled && o.label.toLowerCase().startsWith(term));
      if (idx >= 0) setActiveIndex(idx);
    }
  }

  return (
    <div className="w-full" ref={rootRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-charcoal mb-1.5">
          {label}
          {required && <span className="text-feedback-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative" onKeyDown={onKeyDown}>
        <button
          ref={ref}
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className={cn(
            'input flex items-center justify-between gap-2 text-left',
            error && 'border-feedback-danger bg-feedback-danger/5',
            className
          )}
        >
          <span className={cn('truncate', !selected && 'text-smoke-400')}>
            {selected?.label ?? placeholder}
          </span>
          <svg
            className={cn('w-3.5 h-3.5 shrink-0 text-smoke-500 transition-transform duration-fast', open && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={label}
          className={cn(
            'absolute z-[var(--z-tooltip)] left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface-raised rounded-md border border-smoke-150 shadow-lg py-1 transition-all duration-fast',
            open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
          )}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === current}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => !option.disabled && commit(option.value)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer',
                option.value === current && 'font-semibold',
                activeIndex === index && !option.disabled && 'bg-smoke-50',
                option.disabled && 'text-smoke-300 cursor-not-allowed',
                option.value !== current && activeIndex !== index && !option.disabled && 'text-charcoal'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {option.label}
                {option.value === current && (
                  <svg className="w-4 h-4 text-ember" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {hint && !error && <p className="text-2xs text-smoke-500 mt-1">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-2xs text-feedback-danger mt-1">{error}</p>
      )}
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
});

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 cursor-pointer select-none group', className)}>
      <span className="relative inline-flex items-center justify-center">
        <input ref={ref} id={id} type="checkbox" className="peer sr-only" {...rest} />
        <span className="w-4 h-4 rounded-xs border border-smoke-300 bg-surface-raised transition-colors peer-checked:bg-ember peer-checked:border-ember peer-focus-visible:shadow-[0_0_0_3px_rgba(255,122,28,0.35)]" />
        <svg
          className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
      <span className="text-xs text-charcoal group-hover:text-charcoal-mid">{label}</span>
    </label>
  );
});
