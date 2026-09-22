import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';
import { SELLER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Seller guides — ${cfg.name}`,
    description: `Step-by-step selling guides on Storegrill ${cfg.name}.`,
    path: '/sell/guides',
    regionKey,
  });
}

export default async function SellerGuidesPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Seller guides</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">
            Selling guides
          </h1>
          <p className="mt-4 text-smoke-600 text-lg max-w-2xl mx-auto">
            Step-by-step walkthroughs for applying, listing, importing, fulfilling and getting paid.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" role="list">
          {SELLER_GUIDES.map(g => (
            <li key={g.slug}>
              <Link href={g.path} className="group flex flex-col h-full bg-surface-raised border border-border rounded-2xl p-8 hover:border-ember hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center text-ember mb-5 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" /></svg>
                </div>
                <span className="text-xl font-bold text-charcoal group-hover:text-ember transition-colors">{g.title}</span>
                <span className="text-smoke-600 mt-2 leading-relaxed">{g.description}</span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-12 p-8 bg-ember-deep text-white rounded-[2rem] text-center">
          <h2 className="text-xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-white/80 text-sm max-w-xl mx-auto">
            Apply through the <Link href="/sell" className="underline font-semibold">sell on Storegrill</Link> page, or email{' '}
            <span className="font-mono bg-black/20 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span> for help with your application.
          </p>
        </footer>
      </div>
    </div>
  );
}