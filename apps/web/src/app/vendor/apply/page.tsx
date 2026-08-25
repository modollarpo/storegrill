import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VendorApplyWizard } from '@/components/forms/VendorApplyWizard';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Become a Storegrill vendor',
    description: 'Apply to sell across 44 regions — flat 12% commission, local payouts, logistics handled.',
    path: '/vendor/apply',
    regionKey,
    noIndex: true,
  });
}

export default function VendorApplyPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container-site py-12 max-w-3xl">
        <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Seller application</p>
        <h1 className="mt-2 text-displaymd font-semibold text-charcoal leading-tight">Start selling on Storegrill</h1>
        <p className="mt-3 text-sm text-smoke-600 leading-relaxed max-w-prose">
          Four short steps. Your answers are saved as you go — you can close this page and continue later.
          Verification usually takes two working days.
        </p>
        <div className="card p-6 md:p-8 mt-8 shadow-sm">
          <Suspense fallback={<p className="text-sm text-smoke-500 py-16 text-center">Loading your application…</p>}>
            <VendorApplyWizard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
