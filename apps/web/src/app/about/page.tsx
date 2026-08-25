import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'About Storegrill',
    description: 'Storegrill is a multi-country marketplace connecting verified local vendors with shoppers in 44 regions.',
    path: '/about',
    regionKey,
  });
}

const FACTS = [
  ['44', 'regions live at launch'],
  ['100%', 'vendors identity-verified'],
  ['Local', 'currency, tax & couriers in every market'],
] as const;

export default async function AboutPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill Worldwide</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal max-w-3xl">
        The marketplace that shops like a local, everywhere
      </h1>
      <p className="mt-4 text-sm text-smoke-700 leading-relaxed max-w-prose">
        Storegrill launched with one idea: buying online should feel the same whether you are in Lagos, Nairobi,
        London or Warsaw — prices in your currency, taxes calculated correctly, couriers you recognise and payment
        methods people actually use. Every Storegrill country runs on dedicated in-country infrastructure, so your
        data stays where the law says it should.
      </p>

      <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FACTS.map(([value, label]) => (
          <div key={label} className="card p-5">
            <dt className="order-2 text-xs text-smoke-600 mt-1">{label}</dt>
            <dd className="text-2xl font-bold text-charcoal order-1">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="how" className="mt-8 max-w-prose">
        <h2 id="how" className="text-displaysm font-semibold text-charcoal mb-3">How a marketplace runs per country</h2>
        <p className="text-sm text-smoke-700 leading-relaxed">
          You are viewing <strong>storegrill.{cfg.name === 'United States' ? 'com' : 'net'}</strong> configured for{' '}
          <strong>{cfg.name}</strong>: pricing in {cfg.defaultCurrency}, {cfg.taxRules[0]?.name ?? 'VAT'} applied at
          checkout, delivery by {cfg.shippingZones[0]?.carriers.slice(0, 2).join(' and ')}, and support in{' '}
          {cfg.languages.join(', ')}. Vendors list once and sell everywhere — Storegrill handles currency, tax rules
          and shipping zones per country automatically.
        </p>
      </section>
    </div>
  );
}
