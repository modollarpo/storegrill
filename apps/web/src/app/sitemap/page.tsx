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
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill Worldwide</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Sitemap</h1>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {SECTIONS.map(section => (
          <nav key={section.title} aria-label={section.title} className="card p-5">
            <h2 className="text-sm font-bold text-charcoal mb-3">{section.title}</h2>
            <ul className="space-y-1.5" role="list">
              {section.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-[13px] text-smoke-600 hover:text-ember transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <section aria-labelledby="region-links" className="mt-8 card p-5">
        <h2 id="region-links" className="text-sm font-bold text-charcoal mb-3">
          All regions ({REGION_META.length}) — currently viewing {current.flag} {cfg.name}
        </h2>
        <ul className="flex flex-wrap gap-2" role="list">
          {REGION_META.map(region => (
            <li key={region.key}>
              <a
                href={regionUrl(region.key)}
                hrefLang={region.languages[0]?.code ?? 'en'}
                aria-current={region.key === regionKey ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  region.key === regionKey ? 'border-ember text-ember bg-ember-pale' : 'border-smoke-150 text-smoke-600 hover:border-ember hover:text-ember'
                }`}
              >
                <span aria-hidden="true">{region.flag}</span> {region.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
