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

const GROUPS: Array<{ label: string; test: (key: string) => boolean; color: string }> = [
  {
    label: 'Americas',
    test: key => ['US', 'CA'].includes(key),
    color: 'from-blue-900/10 to-blue-500/5',
  },
  {
    label: 'Europe',
    test: key => ['IE', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'EE', 'LV', 'LT', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'GR', 'CY', 'MT', 'UK'].includes(key),
    color: 'from-ember/10 to-ember-light/5',
  },
  {
    label: 'UK',
    test: key => key === 'UK',
    color: 'from-emerald-900/10 to-emerald-light/5',
  },
  {
    label: 'Middle East',
    test: key => key === 'AE',
    color: 'from-amber-900/10 to-amber-500/5',
  },
  {
    label: 'Africa',
    test: key => ['NG', 'GH', 'KE', 'UG', 'ZA', 'EG', 'MA', 'TZ'].includes(key),
    color: 'from-emerald-900/10 to-emerald-500/5',
  },
  {
    label: 'Asia-Pacific',
    test: key => ['AU', 'JP', 'IN'].includes(key),
    color: 'from-rose-900/10 to-rose-500/5',
  },
];

export default async function RegionsPage() {
  const { regionKey } = await getRequestContext();
  const current = regionByKey(regionKey);

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      {/* Decorative background representing a map/globe feel */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-ember-pale to-transparent -z-10" />
      <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-ember/5 blur-[100px] -z-10" />
      <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-tealink/5 blur-[100px] -z-10" />

      <div className="container-site pt-16">
        <header className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-surface-raised border border-border shadow-sm mb-8">
            <span className="text-2xl leading-none">{current.flag}</span>
            <span className="text-sm font-semibold text-charcoal tracking-wide">
              Currently in {current.name}
            </span>
          </div>
          <h1 className="text-displaylg font-bold text-charcoal tracking-tight mb-6 drop-shadow-sm">
            Storegrill Worldwide
          </h1>
          <p className="text-bodyLg text-smoke-600 leading-relaxed max-w-2xl mx-auto">
            Each Storegrill region runs its own storefront with local pricing in your currency, native payment methods, regional delivery networks and translated content. Select your region below to start shopping.
          </p>
        </header>

        <div className="space-y-16 max-w-6xl mx-auto">
          {GROUPS.map(group => {
            const regions = REGION_META.filter(r => group.test(r.key));
            if (regions.length === 0) return null;
            return (
              <section key={group.label} aria-labelledby={`region-group-${group.label}`} className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <h2 id={`region-group-${group.label}`} className="text-displaymd font-bold text-charcoal">
                    {group.label}
                  </h2>
                  <div className="h-px bg-smoke-200 flex-1" />
                  <span className="text-sm font-medium text-smoke-500 bg-surface px-2 rounded">{regions.length} regions</span>
                </div>
                
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" role="list">
                  {regions.map(region => {
                    const isCurrent = region.key === regionKey;
                    return (
                      <li key={region.key} className="flex">
                        <a
                          href={regionUrl(region.key)}
                          hrefLang={region.languages[0]?.code ?? 'en'}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`w-full relative flex flex-col p-6 rounded-2xl border transition-all duration-normal group overflow-hidden ${
                            isCurrent
                              ? 'bg-surface-raised border-ember shadow-md ring-2 ring-ember/20'
                              : 'bg-surface-raised border-border hover:border-ember hover:shadow-lg hover:-translate-y-1'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${group.color} opacity-0 group-hover:opacity-100 transition-opacity duration-normal`} />
                          
                          <div className="relative z-10 flex items-start justify-between mb-5">
                            <span aria-hidden="true" className="text-5xl leading-none drop-shadow-sm">{region.flag}</span>
                            <span className="inline-flex px-2 py-1 rounded bg-smoke-100 text-xs font-bold text-smoke-700 uppercase tracking-wider group-hover:bg-white group-hover:text-ember group-hover:shadow-sm transition-all">
                              {region.currency}
                            </span>
                          </div>
                          
                          <div className="relative z-10 mt-auto">
                            <span className="block text-headingMd font-bold text-charcoal group-hover:text-ember transition-colors">
                              {region.name}
                            </span>
                            <span className="block text-sm text-smoke-500 mt-1.5 font-medium">
                              {region.languages.map(l => l.nativeName).join(' · ')}
                            </span>
                          </div>
                          
                          {isCurrent && (
                            <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none">
                               <div className="absolute top-5 -right-6 bg-ember text-white text-[10px] font-bold uppercase tracking-wider py-1 px-8 rotate-45 shadow-sm">
                                 Current
                               </div>
                            </div>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-24 p-10 max-w-4xl mx-auto text-center border border-border shadow-sm bg-surface-raised rounded-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-smoke-50 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-headingLg font-bold text-charcoal mb-4">How Storegrill regions work</h2>
            <p className="text-bodyMd text-smoke-600 leading-relaxed mb-8 max-w-3xl mx-auto">
              Every region operates on dedicated infrastructure for compliance and performance — your data stays in-region,
              prices are set by local teams, and checkout supports the payment methods people actually use there
              (iDEAL in the Netherlands, BLIK in Poland, Cash on Delivery in Nigeria & Kenya, Konbini in Japan and more).
            </p>
            <Link href="/" className="btn btn-outline inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold hover:bg-smoke-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to shopping
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
