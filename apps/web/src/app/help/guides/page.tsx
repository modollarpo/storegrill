import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';
import { CUSTOMER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Customer guides — ${cfg.name}`,
    description: `Step-by-step shopping guides on Storegrill ${cfg.name}.`,
    path: '/help/guides',
    regionKey,
  });
}

export default async function CustomerGuidesPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Customer guides</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">
            Shopping guides
          </h1>
          <p className="mt-4 text-smoke-600 text-lg max-w-2xl mx-auto">
            Step-by-step walkthroughs for ordering, tracking, returns, payments, deals and security.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" role="list">
          {CUSTOMER_GUIDES.map(g => (
            <li key={g.slug}>
              <Link href={g.path} className="group flex flex-col h-full bg-surface-raised border border-border rounded-2xl p-8 hover:border-ember hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center text-ember mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-xl font-bold text-charcoal group-hover:text-ember transition-colors">{g.title}</span>
                <span className="text-smoke-600 mt-2 leading-relaxed">{g.description}</span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-12 p-8 bg-ember-deep text-white rounded-[2rem] text-center">
          <h2 className="text-xl font-bold">Still stuck?</h2>
          <p className="mt-2 text-white/80 text-sm max-w-xl mx-auto">
            Email <span className="font-mono bg-black/20 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span> or visit the{' '}
            <Link href="/help" className="underline font-semibold">Help Centre</Link> for answers on delivery, payments and returns in {cfg.name}.
          </p>
        </footer>
      </div>
    </div>
  );
}