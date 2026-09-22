import Link from 'next/link';
import type { ReactNode } from 'react';

export interface GuideLink {
  href: string;
  title: string;
  description?: string;
}

interface GuideLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  related?: GuideLink[];
  children: ReactNode;
}

export function GuideLayout({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  related,
  children,
}: GuideLayoutProps) {
  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-14 max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-smoke-600 hover:text-ember transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {backLabel}
          </Link>
        </nav>

        <header className="mb-10">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">{eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">{title}</h1>
          <p className="mt-4 text-smoke-600 text-lg leading-relaxed max-w-prose">{description}</p>
        </header>

        <div className="space-y-10">{children}</div>

        {related && related.length > 0 && (
          <section aria-labelledby="related-guides" className="mt-14 pt-10 border-t border-border">
            <h2 id="related-guides" className="text-2xl font-bold text-charcoal mb-6">
              Keep reading
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
              {related.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex flex-col h-full bg-surface-raised border border-border rounded-2xl p-6 hover:border-ember hover:shadow-lg transition-all duration-300"
                  >
                    <span className="font-bold text-charcoal group-hover:text-ember transition-colors">
                      {link.title}
                    </span>
                    {link.description && (
                      <span className="text-sm text-smoke-600 mt-2 leading-relaxed">{link.description}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
