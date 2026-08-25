'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ariaProps: { 'aria-describedby': string | undefined; 'aria-invalid': boolean | undefined }) => React.ReactNode;
}

function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-charcoal mb-1.5">
          {label}
          {required && <span className="text-feedback-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children({
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-2xs text-smoke-500 mt-1">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-2xs text-feedback-danger mt-1 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {ariaProps => (
        <input ref={ref} id={id} required={required} className={cn('input', className)} {...ariaProps} {...rest} />
      )}
    </FieldShell>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className, id: idProp, rows = 4, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      {ariaProps => (
        <textarea ref={ref} id={id} rows={rows} required={required} className={cn('input', className)} {...ariaProps} {...rest} />
      )}
    </FieldShell>
  );
});
