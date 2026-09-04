import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { REGION_META, regionUrl, regionByKey } from '@/lib/regions';
import { regionConfig } from '@/lib/region-content';


const SECTIONS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: 'Shopping',
    links: [
      ['All products', '/products'],
      ['Today\u2019s deals', '/deals'],
      ['Vendors', '/vendors'],
      ['Your basket', '/cart'],
      ['Wishlist', '/wishlist'],
    ],
  },
  {
    title: 'Your account',
    links: [
      ['Sign in', '/auth/signin'],
      ['Orders', '/account/orders'],
      ['Track a parcel', '/track'],
    ],
  },
  {
    title: 'Help & policies',
    links: [
      ['Help centre', '/help'],
      ['Delivery & shipping rates', '/shipping'],
      ['Ways to pay', '/payments'],
      ['Returns & refunds', '/returns'],
      ['Contact us', '/contact'],
      ['Privacy & cookies', '/privacy'],
      ['Terms & conditions', '/terms'],
      ['Product recalls', '/recalls'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About Storegrill', '/about'],
      ['Sell on Storegrill', '/sell'],
      ['Choose your region', '/regions'],
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Sitemap — Storegrill',
    description: 'Every page on Storegrill, organised.',
    path: '/sitemap',
    regionKey,
  });
}

export default async function SitemapPage() {
  const { regionKey } = await getRequestContext();
  const current = regionByKey(regionKey);
  const cfg = regionConfig(regionKey);

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-5xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill Worldwide</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">Sitemap</h1>
          <p className="mt-4 text-smoke-600 text-lg max-w-2xl mx-auto">Directory of all public pages on Storegrill.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {SECTIONS.map(section => (
            <nav key={section.title} aria-label={section.title} className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-charcoal mb-4 pb-2 border-b border-border">{section.title}</h2>
              <ul className="space-y-3" role="list">
                {section.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-smoke-600 font-medium hover:text-ember transition-colors flex items-center gap-2 group">
                      <svg className="w-3.5 h-3.5 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all text-ember" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <section aria-labelledby="region-links" className="bg-surface-raised border border-border rounded-[2rem] p-8 shadow-sm">
          <header className="mb-6">
            <h2 id="region-links" className="text-2xl font-bold text-charcoal mb-2">
              All regions ({REGION_META.length})
            </h2>
            <p className="text-smoke-600">Currently viewing {current.flag} <strong className="text-charcoal">{cfg.name}</strong></p>
          </header>
          <ul className="flex flex-wrap gap-3" role="list">
            {REGION_META.map(region => (
              <li key={region.key}>
                <a
                  href={regionUrl(region.key)}
                  hrefLang={region.languages[0]?.code ?? 'en'}
                  aria-current={region.key === regionKey ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                    region.key === regionKey 
                      ? 'bg-ember text-white shadow-sm ring-2 ring-ember/20 ring-offset-2' 
                      : 'bg-surface border border-border text-smoke-600 hover:border-ember hover:text-ember hover:shadow-sm'
                  }`}
                >
                  <span aria-hidden="true" className="text-lg leading-none">{region.flag}</span> {region.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
