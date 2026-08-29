import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { REGION_META, regionUrl, regionByKey } from '@/lib/regions';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const meta = buildMetadata({
    title: 'Choose Your Country or Region',
    description:
      'Shop Storegrill in your country with local currency, language, payment methods and delivery. Available across North America, Europe, the Middle East, Africa and Asia-Pacific.',
    path: '/regions',
    regionKey,
  });
  return meta;
}

const GROUPS: Array<{ label: string; test: (key: string) => boolean }> = [
  {
    label: 'Americas',
    test: key => ['US', 'CA'].includes(key),
  },
  {
    label: 'Europe',
    test: key => ['UK', 'IE', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'EE', 'LV', 'LT', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'GR', 'CY', 'MT'].includes(key),
  },
  {
    label: 'Middle East',
    test: key => key === 'AE',
  },
  {
    label: 'Africa',
    test: key => ['NG', 'GH', 'KE', 'UG', 'ZA', 'EG', 'MA', 'TZ'].includes(key),
  },
  {
    label: 'Asia-Pacific',
    test: key => ['AU', 'JP', 'IN'].includes(key),
  },
];

export default async function RegionsPage() {
  const { regionKey, language } = await getRequestContext();
  const current = regionByKey(regionKey);

  return (
    <div className="container-site py-10">
      <header className="max-w-prose">
        <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill Worldwide</p>
        <h1 className="mt-2 text-displaymd md:text-displaylg font-semibold text-charcoal max-w-3xl">
          Choose your country or region
        </h1>
        <p className="mt-3 text-sm text-smoke-600 leading-relaxed">
          You are currently shopping on <strong>{current.flag} {regionKey.toLowerCase()}.Storegrill.net</strong>.
          Each Storegrill region runs its own storefront with local pricing in your currency, native payment methods,
          regional delivery networks and translated content.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {GROUPS.map(group => {
          const regions = REGION_META.filter(r => group.test(r.key));
          if (regions.length === 0) return null;
          return (
            <section key={group.label} aria-labelledby={`region-group-${group.label}`}>
              <h2 id={`region-group-${group.label}`} className="text-displaysm font-semibold text-charcoal mb-4 flex items-center gap-3">
                {group.label}
                <span className="text-xs font-normal text-smoke-400">{regions.length} regions</span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
                {regions.map(region => {
                  const isCurrent = region.key === regionKey;
                  return (
                    <li key={region.key}>
                      <a
                        href={regionUrl(region.key)}
                        hrefLang={region.languages[0]?.code ?? 'en'}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex items-center gap-4 p-4 rounded-lg border bg-surface-raised transition-all duration-fast group ${
                          isCurrent
                            ? 'border-ember shadow-sm ring-1 ring-ember/30'
                            : 'border-smoke-150 hover:border-ember hover:shadow-card'
                        }`}
                      >
                        <span aria-hidden="true" className="text-3xl leading-none shrink-0">{region.flag}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-charcoal truncate group-hover:text-tealink-hover transition-colors">
                            {region.name}
                          </span>
                          <span className="block text-2xs text-smoke-500 mt-0.5 truncate">
                            {region.languages.map(l => l.nativeName).join(' · ')}
                          </span>
                          <span className="mt-1 inline-block px-1.5 py-px rounded-xs bg-smoke-100 text-2xs font-bold text-smoke-600 uppercase tracking-wide">
                            {region.currency}
                          </span>
                        </span>
                        <svg className="w-4 h-4 text-smoke-300 icon-directional group-hover:text-ember transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </a>
                      {isCurrent && (
                        <p className="sr-only">Current region</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="mt-12 card p-6 max-w-prose">
        <h2 className="text-sm font-bold text-charcoal">How Storegrill regions work</h2>
        <p className="mt-2 text-xs text-smoke-600 leading-relaxed">
          Every region operates on dedicated infrastructure for compliance and performance — your data stays in-region,
          prices are set by local teams, and checkout supports the payment methods people actually use there
          (iDEAL in the Netherlands, BLIK in Poland, Cash on Delivery in Nigeria &amp; Kenya, Konbini in Japan and more via Stripe &amp; PayPal).
        </p>
        <Link href="/" className="btn btn-outline btn-sm mt-4">← Back to shopping</Link>
      </footer>
    </div>
  );
}
