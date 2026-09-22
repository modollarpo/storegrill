'use client';

import Link from 'next/link';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { VENDOR_GUIDES } from '@/lib/vendor-guides';

export default function VendorGuidesPage() {
  return (
    <VendorShell>
      <PageHeader title="Guides" subtitle="Step-by-step walkthroughs for the vendor portal" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VENDOR_GUIDES.map(guide => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group flex flex-col h-full bg-white border border-surface-200 rounded-2xl p-6 hover:border-brand-300 hover:shadow-md transition-all"
          >
            <span className="text-base font-bold text-surface-900 group-hover:text-brand-700 transition-colors">
              {guide.title}
            </span>
            <span className="text-xs font-medium text-surface-400 mt-1">{guide.subtitle}</span>
            <span className="text-sm text-surface-600 mt-3 leading-relaxed">{guide.description}</span>
          </Link>
        ))}
      </div>
    </VendorShell>
  );
}