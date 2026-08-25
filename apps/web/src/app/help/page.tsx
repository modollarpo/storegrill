import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';


const TOPICS = [
  { href: '/shipping', title: 'Delivery & shipping rates', desc: 'Costs, thresholds, ETAs and courier partners for your country.' },
  { href: '/payments', title: 'Ways to pay', desc: 'Every payment method available in your region and how each works.' },
  { href: '/returns', title: 'Returns & refunds', desc: '30-day returns, free collection for faults, COD refund rules.' },
  { href: '/track', title: 'Track an order', desc: 'Follow a parcel with your order number — no sign-in needed.' },
  { href: '/account/orders', title: 'Your orders', desc: 'Invoices, delivery status and returns for signed-in shoppers.' },
  { href: '/contact', title: 'Contact us', desc: 'Reach the support team for your country by email or form.' },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Help Centre — Storegrill ${cfg.name}`,
    description: `Answers about delivery, payments, returns and orders on Storegrill ${cfg.name}.`,
    path: '/help',
    regionKey,
  });
}

export default async function HelpPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">How can we help?</h1>

      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
        {TOPICS.map(t => (
          <li key={t.href}>
            <Link href={t.href} className="card p-5 flex flex-col h-full hover:border-ember hover:shadow-card transition-all duration-fast group">
              <span className="text-sm font-bold text-charcoal group-hover:text-ember transition-colors">{t.title}</span>
              <span className="text-xs text-smoke-600 mt-1.5 leading-relaxed">{t.desc}</span>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-8 card p-6 max-w-prose">
        <h2 className="text-sm font-bold text-charcoal">Still stuck?</h2>
        <p className="mt-2 text-xs text-smoke-600 leading-relaxed">
          Email <span className="font-mono">{supportEmailFor(regionKey)}</span> and include your order number
          (format SG-XXXXXX). Our {cfg.name} team replies within one working day.
        </p>
      </footer>
    </div>
  );
}
