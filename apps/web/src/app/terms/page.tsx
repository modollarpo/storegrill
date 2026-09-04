import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, lawFor, supportEmailFor } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Terms & Conditions — Storegrill ${cfg.name}`,
    description: `The terms on which Storegrill ${cfg.name} sells to consumers, including pricing in ${cfg.defaultCurrency}, delivery and returns.`,
    path: '/terms',
    regionKey,
  });
}

export default async function TermsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const law = lawFor(regionKey);

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center border-b border-border pb-10">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight mb-4">Terms &amp; conditions</h1>
          <p className="text-smoke-500 font-mono text-sm bg-surface-raised border border-border inline-flex px-3 py-1 rounded-full">
            Version 3.0 · 23 August 2026 · For {law.jurisdictionNote}
          </p>
        </header>

        <ol className="space-y-12 text-lg text-smoke-600 leading-relaxed list-decimal pl-6 marker:text-ember marker:font-bold">
          <section aria-labelledby="t-about" className="pl-4">
            <h2 id="t-about" className="text-2xl font-bold text-charcoal mb-4">About these terms</h2>
            <p>
              These terms govern your use of this storefront and any purchase you make on it. The seller of record for
              marketplace items is the independent vendor listed on each product page; Storegrill provides the platform,
              payment processing and logistics coordination.
            </p>
          </section>

          <section aria-labelledby="t-price" className="pl-4">
            <h2 id="t-price" className="text-2xl font-bold text-charcoal mb-4">Prices, tax and payment</h2>
            <ul className="list-disc pl-5 space-y-3 marker:text-smoke-300">
              <li>All prices are quoted in <strong className="text-charcoal font-bold">{cfg.defaultCurrency}</strong> and include {cfg.taxRules[0]?.name ?? 'VAT'} at {Math.round((cfg.taxRules[0]?.rate ?? 0) * 1000) / 10}% where applicable.</li>
              <li>We may correct pricing errors before dispatch; if the true price is higher you may cancel free of charge.</li>
              <li>Accepted methods are shown on our <Link href="/payments" className="text-ember font-bold hover:underline underline-offset-4 transition-colors">ways to pay</Link> page and at checkout.</li>
            </ul>
          </section>

          <section aria-labelledby="t-delivery" className="pl-4">
            <h2 id="t-delivery" className="text-2xl font-bold text-charcoal mb-4">Delivery</h2>
            <ul className="list-disc pl-5 space-y-3 marker:text-smoke-300">
              <li>Delivery estimates ({cfg.shippingZones[0]?.estimatedDaysMin}–{cfg.shippingZones[0]?.estimatedDaysMax} working days standard) begin from dispatch confirmation.</li>
              <li>Risk passes to you on delivery; report transit damage within 48 hours for a free replacement.</li>
            </ul>
          </section>

          <section aria-labelledby="t-cancel" className="pl-4">
            <h2 id="t-cancel" className="text-2xl font-bold text-charcoal mb-4">Cancellation &amp; returns</h2>
            <p>You may cancel before dispatch free of charge and return most items within 30 days — full details in our <Link href="/returns" className="text-ember font-bold hover:underline underline-offset-4 transition-colors">returns policy</Link>. Nothing in these terms limits your statutory consumer rights.</p>
          </section>

          <section aria-labelledby="t-marketplace" className="pl-4">
            <h2 id="t-marketplace" className="text-2xl font-bold text-charcoal mb-4">Marketplace vendors</h2>
            <p>Vendors warrant that listings are accurate, authentic and permitted for sale in {cfg.name}. If a vendor repeatedly breaches our standards we remove them — your remedy always runs against Storegrill first.</p>
          </section>

          <section aria-labelledby="t-law" className="pl-4">
            <h2 id="t-law" className="text-2xl font-bold text-charcoal mb-4">Governing law</h2>
            <p>
              These terms are governed by the laws of <strong className="text-charcoal">{cfg.name}</strong>. Disputes are subject to the non-exclusive jurisdiction
              of the <strong className="text-charcoal">{law.courts}</strong>; consumers may also bring proceedings in their country of residence. Data protection is
              handled under the <strong className="text-charcoal">{law.act}</strong>.
            </p>
          </section>

          <section aria-labelledby="t-contact" className="pl-4 pb-12">
            <h2 id="t-contact" className="text-2xl font-bold text-charcoal mb-4">Contact</h2>
            <p>
              Storegrill Group Limited · support:{' '}
              <span className="font-mono bg-surface-raised border border-border py-1 px-2 rounded-md font-semibold text-charcoal">{supportEmailFor(regionKey)}</span>
              {' '}·{' '}
              <Link href="/contact" className="text-ember font-bold hover:underline underline-offset-4 transition-colors">contact form</Link>
            </p>
          </section>
        </ol>
      </div>
    </div>
  );
}
