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
    <div className="container-site py-10 max-w-3xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Terms &amp; conditions</h1>
      <p className="mt-2 text-xs text-smoke-500">Version 3.0 · 23 August 2026 · For {law.jurisdictionNote}</p>

      <ol className="mt-8 space-y-8 text-sm text-smoke-700 leading-relaxed list-decimal pl-5">
        <section aria-labelledby="t-about">
          <h2 id="t-about" className="text-displaysm font-semibold text-charcoal mb-2">About these terms</h2>
          <p>
            These terms govern your use of this storefront and any purchase you make on it. The seller of record for
            marketplace items is the independent vendor listed on each product page; Storegrill provides the platform,
            payment processing and logistics coordination.
          </p>
        </section>

        <section aria-labelledby="t-price">
          <h2 id="t-price" className="text-displaysm font-semibold text-charcoal mb-2">Prices, tax and payment</h2>
          <ul className="list-disc pl-5 space-y-1.5 mt-1">
            <li>All prices are quoted in <strong>{cfg.defaultCurrency}</strong> and include {cfg.taxRules[0]?.name ?? 'VAT'} at {Math.round((cfg.taxRules[0]?.rate ?? 0) * 1000) / 10}% where applicable.</li>
            <li>We may correct pricing errors before dispatch; if the true price is higher you may cancel free of charge.</li>
            <li>Accepted methods are shown on our <Link href="/payments" className="text-ember hover:underline underline-offset-2">ways to pay</Link> page and at checkout.</li>
          </ul>
        </section>

        <section aria-labelledby="t-delivery">
          <h2 id="t-delivery" className="text-displaysm font-semibold text-charcoal mb-2">Delivery</h2>
          <ul className="list-disc pl-5 space-y-1.5 mt-1">
            <li>Delivery estimates ({cfg.shippingZones[0]?.estimatedDaysMin}–{cfg.shippingZones[0]?.estimatedDaysMax} working days standard) begin from dispatch confirmation.</li>
            <li>Risk passes to you on delivery; report transit damage within 48 hours for a free replacement.</li>
          </ul>
        </section>

        <section aria-labelledby="t-cancel">
          <h2 id="t-cancel" className="text-displaysm font-semibold text-charcoal mb-2">Cancellation &amp; returns</h2>
          <p>You may cancel before dispatch free of charge and return most items within 30 days — full details in our <Link href="/returns" className="text-ember hover:underline underline-offset-2">returns policy</Link>. Nothing in these terms limits your statutory consumer rights.</p>
        </section>

        <section aria-labelledby="t-marketplace">
          <h2 id="t-marketplace" className="text-displaysm font-semibold text-charcoal mb-2">Marketplace vendors</h2>
          <p>Vendors warrant that listings are accurate, authentic and permitted for sale in {cfg.name}. If a vendor repeatedly breaches our standards we remove them — your remedy always runs against Storegrill first.</p>
        </section>

        <section aria-labelledby="t-law">
          <h2 id="t-law" className="text-displaysm font-semibold text-charcoal mb-2">Governing law</h2>
          <p>
            These terms are governed by the laws of {cfg.name}. Disputes are subject to the non-exclusive jurisdiction
            of the {law.courts}; consumers may also bring proceedings in their country of residence. Data protection is
            handled under the {law.act}.
          </p>
        </section>

        <section aria-labelledby="t-contact">
          <h2 id="t-contact" className="text-displaysm font-semibold text-charcoal mb-2">Contact</h2>
          <p>Storegrill Group Limited · support: <span className="font-mono">{supportEmailFor(regionKey)}</span> · <Link href="/contact" className="text-ember hover:underline underline-offset-2">contact form</Link></p>
        </section>
      </ol>
    </div>
  );
}
