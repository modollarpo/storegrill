'use client';

import Link from 'next/link';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import type { VendorGuide, VendorGuideBlock } from '@/lib/vendor-guides';

function GuideBlockView({ block }: { block: VendorGuideBlock }) {
  switch (block.kind) {
    case 'para':
      return <p className="text-sm text-surface-600 leading-relaxed">{block.text}</p>;
    case 'list':
      return (
        <div>
          {block.heading && <p className="text-xs font-bold uppercase tracking-wide text-surface-500 mb-2">{block.heading}</p>}
          <ul className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 items-start text-sm text-surface-600 leading-relaxed">
                <svg className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'steps':
      return (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white grid place-items-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-surface-600 leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'tip':
      return (
        <aside className="rounded-xl bg-brand-50 border border-brand-100 p-4">
          <p className="text-xs font-bold text-brand-700 mb-1">{block.title}</p>
          <p className="text-sm text-surface-600 leading-relaxed">{block.text}</p>
        </aside>
      );
  }
}

interface VendorGuideLayoutProps {
  guide: VendorGuide;
  related: VendorGuide[];
}

export function VendorGuideLayout({ guide, related }: VendorGuideLayoutProps) {
  return (
    <VendorShell>
      <PageHeader title={guide.title} subtitle={guide.subtitle} />

      <p className="mb-8 max-w-2xl text-sm text-surface-600 leading-relaxed">{guide.description}</p>

      <div className="space-y-6">
        {guide.sections.map(section => (
          <section key={section.heading} className="bg-white border border-surface-200 rounded-2xl p-6">
            <h2 className="text-base font-bold text-surface-900 mb-4">{section.heading}</h2>
            <div className="space-y-4">{section.blocks.map((block, i) => <GuideBlockView key={i} block={block} />)}</div>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <section className="mt-10 pt-8 border-t border-surface-200">
          <h2 className="text-sm font-bold text-surface-900 mb-4">Next guides</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map(g => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="flex flex-col h-full bg-white border border-surface-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-md transition-all"
                >
                  <span className="text-sm font-bold text-surface-900">{g.title}</span>
                  <span className="text-xs text-surface-500 mt-1 leading-relaxed">{g.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </VendorShell>
  );
}