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
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-12 md:py-20 flex flex-col lg:flex-row gap-12 lg:gap-16">
        <div className="lg:w-1/3 flex flex-col justify-start space-y-6">
          <p className="text-text-link font-bold text-label-md uppercase tracking-widest">Seller application</p>
          <h1 className="text-display-md lg:text-display-lg font-bold text-text-primary tracking-tight leading-tight">Start selling on Storegrill</h1>
          <p className="text-body-lg text-text-secondary leading-relaxed">
            Four short steps. Your answers are saved as you go — you can close this page and continue later.
            Verification usually takes two working days.
          </p>
        </div>
        <div className="lg:w-2/3">
          <div className="bg-surface border border-border rounded-2xl p-6 md:p-10 shadow-lg relative overflow-hidden">
            <Suspense fallback={<p className="text-body-md text-text-tertiary py-20 text-center animate-pulse">Loading your application…</p>}>
              <VendorApplyWizard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
