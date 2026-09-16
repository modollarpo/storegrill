import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required = false, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="flex items-center gap-1 text-[13px] font-semibold text-surface-700 mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <p className="text-[11px] text-surface-400 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full h-10 rounded-lg border bg-white px-3 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:outline-none focus:ring-2',
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-surface-300 focus:border-brand-500 focus:ring-brand-100',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 rounded-lg border bg-white px-3 pr-8 text-sm text-surface-900 transition-colors focus:outline-none focus:ring-2 appearance-none bg-[url("data:image/svg+xml,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20fill%3d%22none%22%20viewBox%3d%220%200%2020%2020%22%20stroke%3d%22%2364748b%22%20stroke-width%3d%221.5%22%3e%3cpath%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%20d%3d%22M6%208l4%204%204-4%22%2f%3e%3c%2fsvg%3e")] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat',
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-surface-300 focus:border-brand-500 focus:ring-brand-100',
      className,
  )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

interface CheckboxProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 transition-colors"
      />
      <span className="text-sm text-surface-700 font-medium">{label}</span>
    </label>
  );
}
