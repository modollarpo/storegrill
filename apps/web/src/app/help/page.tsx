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
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">How can we help?</h1>
          <p className="mt-4 text-smoke-600 text-lg">Select a topic below or contact our regional support team.</p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" role="list">
          {TOPICS.map(t => (
            <li key={t.href}>
              <Link href={t.href} className="group flex flex-col h-full bg-surface-raised border border-border rounded-2xl p-8 hover:border-ember hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center text-ember mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-xl font-bold text-charcoal group-hover:text-ember transition-colors">{t.title}</span>
                <span className="text-smoke-600 mt-2 leading-relaxed">{t.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-16 p-10 bg-ember-deep text-white rounded-[2rem] text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-white/20"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-ember-light rounded-full blur-[80px] opacity-40"></div>
          <h2 className="text-2xl font-bold relative z-10">Still stuck?</h2>
          <p className="mt-4 text-white/80 leading-relaxed max-w-2xl mx-auto relative z-10">
            Email <span className="font-mono bg-black/20 py-1 px-2 rounded font-semibold">{supportEmailFor(regionKey)}</span> and include your order number (format SG-XXXXXX). Our {cfg.name} team replies within one working day.
          </p>
        </footer>
      </div>
    </div>
  );
}
