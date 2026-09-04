'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface RadioProps {
  label: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  description?: string;
  className?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, name, checked, defaultChecked, onChange, disabled, description, className },
  ref
) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-2.5 cursor-pointer select-none group',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span className="relative inline-flex items-center justify-center mt-px shrink-0">
        <input
          ref={ref}
          id={id}
          type="radio"
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="w-4 h-4 rounded-full border border-smoke-300 bg-surface-raised peer-checked:border-[5px] peer-checked:border-ember transition-all peer-focus-visible:shadow-[0_0_0_3px_rgba(255,122,28,0.35)]" />
      </span>
      <span>
        <span className="block text-xs text-charcoal font-medium group-hover:text-charcoal-mid">{label}</span>
        {description && <span className="block text-2xs text-smoke-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
});

export interface RadioGroupProps {
  legend?: string;
  name: string;
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function RadioGroup({ legend, name, options, value, defaultValue, onChange, className }: RadioGroupProps) {
  return (
    <fieldset className={className}>
      {legend && <legend className="text-xs font-bold text-charcoal mb-2">{legend}</legend>}
      <div role="radiogroup" aria-label={legend} className="space-y-2">
        {options.map(option => (
          <Radio
            key={option.value}
            name={name}
            label={option.label}
            description={option.description}
            disabled={option.disabled}
            checked={value !== undefined ? value === option.value : undefined}
            defaultChecked={value === undefined ? defaultValue === option.value : undefined}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
