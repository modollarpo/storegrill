import { cn } from '@/lib/utils';

export interface FormRowProps {
  label: string;
  htmlFor?: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ label, htmlFor, description, required, error, children, className }: FormRowProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 md:gap-6 py-4 border-b border-slate-100 last:border-b-0', className)}>
      <div>
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-900 md:pt-2">
          {label}
          {required && <span className="text-rose-600 ml-0.5" aria-hidden="true">*</span>}
        </label>
        {description && <p id={htmlFor ? `${htmlFor}-desc` : undefined} className="text-[11px] text-slate-500 mt-1 leading-relaxed">{description}</p>}
      </div>
      <div>
        {children}
        {error && (
          <p role="alert" className="mt-1.5 text-[11px] text-rose-700 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function FormSection({ title, description, children, footer }: FormSectionProps) {
  return (
    <section className="bg-surface-raised rounded-lg border border-slate-200 shadow-card mb-5">
      <header className="px-5 pt-4 pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </header>
      <div className="px-5 pb-1 divide-y divide-slate-50">{children}</div>
      {footer && <footer className="px-5 py-3.5 bg-slate-50/70 rounded-b-lg flex justify-end gap-2">{footer}</footer>}
    </section>
  );
}

export const inputClass =
  'w-full h-9 rounded-md border border-slate-300 bg-surface-raised px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400';

export const textareaClass =
  'w-full min-h-[88px] rounded-md border border-slate-300 bg-surface-raised px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors';
