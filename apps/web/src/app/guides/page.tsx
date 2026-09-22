import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { CUSTOMER_GUIDES, SELLER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Guides — ${cfg.name}`,
    description: `Step-by-step shopping and selling guides on Storegrill ${cfg.name}.`,
    path: '/guides',
    regionKey,
  });
}

export default async function GuidesPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-5xl">
        <header className="mb-14 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">Guides</h1>
          <p className="mt-4 text-smoke-600 text-lg max-w-2xl mx-auto">
            Step-by-step guides for shoppers and sellers. Pick a topic below to get the walkthrough for your region.
          </p>
        </header>

        {[
          { label: 'For shoppers', subtitle: 'Order, track, return and protect your account.', entries: CUSTOMER_GUIDES },
          { label: 'For sellers', subtitle: 'Apply, list, import and get paid.', entries: SELLER_GUIDES },
        ].map(group => (
          <section key={group.label} className="mb-12">
            <div className="flex items-baseline gap-4 mb-6">
              <h2 className="text-2xl font-bold text-charcoal">{group.label}</h2>
              <span className="text-sm text-smoke-600">{group.subtitle}</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" role="list">
              {group.entries.map(g => (
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
          </section>
        ))}

        <footer className="p-8 bg-surface-raised border border-border rounded-2xl text-center">
          <p className="text-smoke-600">
            Need a topic we have not covered?{' '}
            <Link href="/contact" className="text-ember font-semibold hover:text-ember-deep">
              Contact the {cfg.name} support team
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}