import type { ReactNode } from 'react';

interface GuideSectionProps {
  title: string;
  children: ReactNode;
}

export function GuideSection({ title, children }: GuideSectionProps) {
  return (
    <section className="bg-surface-raised border border-border rounded-2xl p-8">
      <h2 className="text-displaysm font-semibold text-charcoal mb-4">{title}</h2>
      <div className="space-y-4 text-sm text-smoke-700 leading-relaxed">{children}</div>
    </section>
  );
}

interface GuideStepsProps {
  items: ReactNode[];
}

export function GuideSteps({ items }: GuideStepsProps) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 items-start">
          <span
            aria-hidden="true"
            className="shrink-0 w-8 h-8 rounded-full bg-ember text-white grid place-items-center font-bold text-sm"
          >
            {i + 1}
          </span>
          <span className="pt-1 text-sm text-smoke-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

interface GuideCalloutProps {
  title: string;
  children: ReactNode;
}

export function GuideCallout({ title, children }: GuideCalloutProps) {
  return (
    <aside className="rounded-xl bg-ember-pale border border-border p-5">
      <p className="font-bold text-charcoal mb-1">{title}</p>
      <p className="text-sm text-smoke-700 leading-relaxed">{children}</p>
    </aside>
  );
}
