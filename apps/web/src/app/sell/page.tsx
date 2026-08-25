import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';


const STEPS = [
  ['Apply in minutes', 'Tell us about your business — registration, product categories and warehouse location. Verification usually takes two working days.'],
  ['List once, sell everywhere', 'One catalogue. We translate listings, convert prices to each country’s currency and apply the right tax rules automatically.'],
  ['Hand over to our couriers', 'Print a label or drop at a partner point. Country-level delivery zones, rates and ETAs are already configured.'],
  ['Get paid locally', 'Payouts land in your bank account in your own currency on a fixed weekly schedule, with VAT invoices generated for you.'],
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Sell on Storegrill — ${cfg.name}`,
    description: `Reach shoppers across 44 regions from ${cfg.name}. Verified vendors, local payouts in ${cfg.defaultCurrency}, logistics handled.`,
    path: '/sell',
    regionKey,
  });
}

export default async function SellPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const zone = cfg.shippingZones[0];

  return (
    <div className="bg-white min-h-screen">
      <div className="container-site py-12 max-w-4xl">
        <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill for business</p>
        <h1 className="mt-2 text-displaymd md:text-displaylg font-semibold text-charcoal max-w-3xl leading-tight">
          Sell across Africa, Europe &amp; beyond — starting in {cfg.name}
        </h1>
        <p className="mt-4 text-sm text-smoke-700 leading-relaxed max-w-prose">
          Storegrill is vendor-first: flat commission, no listing fees, payouts in <strong>{cfg.defaultCurrency}</strong>,
          and every country&apos;s tax, language and delivery network handled for you.
        </p>

        <ol className="mt-10 space-y-4">
          {STEPS.map(([title, desc], i) => (
            <li key={title} className="card p-5 flex gap-4 items-start">
              <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-full bg-ember text-white grid place-items-center font-bold">{i + 1}</span>
              <span>
                <span className="block text-sm font-bold text-charcoal">{title}</span>
                <span className="block text-xs text-smoke-600 mt-1 leading-relaxed">{desc}</span>
              </span>
            </li>
          ))}
        </ol>

        <section aria-labelledby="sell-facts" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-5">
            <h2 id="sell-facts" className="sr-only">Marketplace facts</h2>
            <p className="text-xs font-bold uppercase tracking-wide text-smoke-500">Commission</p>
            <p className="text-xl font-bold text-charcoal mt-1">12% flat</p>
            <p className="text-2xs text-smoke-500 mt-1">No listing or monthly fees.</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-smoke-500">Your payout currency</p>
            <p className="text-xl font-bold text-charcoal mt-1">{cfg.defaultCurrency}</p>
            <p className="text-2xs text-smoke-500 mt-1">Weekly, straight to your bank.</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-smoke-500">Logistics partners here</p>
            <p className="text-sm font-bold text-charcoal mt-1.5 leading-snug">{zone?.carriers.join(' · ')}</p>
            <p className="text-2xs text-smoke-500 mt-1">{zone ? `${zone.estimatedDaysMin}–${zone.estimatedDaysMax} day delivery` : 'Nationwide coverage'}</p>
          </div>
        </section>

        <div className="mt-10 card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-smoke-700 max-w-md">
            Apply online in about ten minutes — your progress is saved at every step, and our team reviews new
            applications within two working days.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/vendor/apply" className="btn btn-primary btn-md rounded-full px-7">Apply now</Link>
            <Link href="/help" className="btn btn-outline btn-md rounded-full px-7">Questions?</Link>
          </div>
        </div>
        <p className="mt-4 text-2xs text-smoke-400">
          Support: {supportEmailFor(regionKey)}
        </p>
      </div>
    </div>
  );
}
