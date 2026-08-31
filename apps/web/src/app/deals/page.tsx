import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getRequestContext } from '@/lib/server-context';
import { translateBatch } from '@/lib/server-translate';
import { buildMetadata, SEO_DEFAULTS } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { WaitingRoomClient } from './WaitingRoomClient';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({ ...SEO_DEFAULTS.deals(), path: '/deals', regionKey, ogImage: '/banners/bannerThree.jpg' });
}

interface DealRow {
  id: string;
  name?: string;
  slug?: string;
  type: string;
  value: number;
  endsAt?: string;
  description?: string;
  currencyCode?: string;
  productIds?: string[];
  image?: string;
}

async function fetchDeals(regionKey: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals?regionKey=${regionKey}&enabled=true`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { deals: [] };
  }
}

function dealLabel(deal: DealRow): string {
  if (deal.type === 'PERCENTAGE_OFF') return `${deal.value}% OFF`;
  if (deal.type === 'FIXED_AMOUNT_OFF') return 'SAVE';
  return 'DEAL';
}

function dealValueDisplay(deal: DealRow): string {
  if (deal.type === 'PERCENTAGE_OFF') return `${deal.value}% off`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode || 'USD', maximumFractionDigits: 0 }).format(deal.value / 100) + ' off';
}

// Deterministic random generator for visual flair based on deal string
function getDealClaimedPercent(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return 60 + (Math.abs(hash) % 35); // Returns between 60 and 95
}

export default async function DealsPage() {
  const { regionKey, language } = await getRequestContext();
  const data = await fetchDeals(regionKey);
  let deals: DealRow[] = Array.isArray(data.deals) ? data.deals : [];

  if (deals.length > 0 && language !== 'en') {
    const translated = await translateBatch(deals.map(d => d.name || ''), language);
    deals = deals.map((d, i) => ({ ...d, name: translated[i] || d.name }));
  }

  const spotlightDeal = deals.length > 0 ? deals[0] : null;
  const regularDeals = deals.slice(1);

  return (
    <WaitingRoomClient>
      <div className="bg-surface-sunken min-h-screen pb-20">
        {/* Modern Enterprise Header */}
        <header className="relative bg-gradient-to-br from-midnight via-ember-deep to-ember pt-12 pb-20 px-4 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.1) 40px,rgba(255,255,255,0.1) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.1) 40px,rgba(255,255,255,0.1) 41px)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-amber-400/10 to-transparent blur-3xl rounded-full translate-x-1/4" />
          
          <div className="container-fluid relative z-10">
            <div className="mb-8">
              <Breadcrumb items={[{ name: "Today's Deals", path: '' }]} regionKey={regionKey} />
            </div>
            
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Live Updates</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-5 leading-tight">
                Today&apos;s Exclusive Deals
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
                Curated limited-time offers across every category — refreshed daily with verified regional shipping.
              </p>
            </div>
          </div>
        </header>

        {/* Filter Tab Bar (Sticky) */}
        <div className="sticky top-[73px] z-30 bg-surface border-b border-border shadow-sm mb-10 overflow-hidden">
          <div className="container-fluid">
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none py-4">
              <button className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-bold whitespace-nowrap shadow-md">All Deals</button>
              <button className="px-5 py-2 rounded-full bg-surface-raised border border-border text-text-secondary text-sm font-bold whitespace-nowrap hover:bg-surface-sunken hover:text-charcoal transition-colors">Lightning Deals</button>
              <button className="px-5 py-2 rounded-full bg-surface-raised border border-border text-text-secondary text-sm font-bold whitespace-nowrap hover:bg-surface-sunken hover:text-charcoal transition-colors">Tech & Gadgets</button>
              <button className="px-5 py-2 rounded-full bg-surface-raised border border-border text-text-secondary text-sm font-bold whitespace-nowrap hover:bg-surface-sunken hover:text-charcoal transition-colors">Home Essentials</button>
              <button className="px-5 py-2 rounded-full bg-surface-raised border border-border text-text-secondary text-sm font-bold whitespace-nowrap hover:bg-surface-sunken hover:text-charcoal transition-colors">Clearance</button>
            </nav>
          </div>
        </div>

        <div className="container-fluid">
          {deals.length === 0 ? (
            <div className="rounded-3xl border border-border bg-surface p-20 text-center shadow-sm">
              <div className="w-20 h-20 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-6 text-smoke-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">No active deals right now</h2>
              <p className="text-smoke-500">Check back later or browse our categories for everyday low prices.</p>
            </div>
          ) : (
            <div className="space-y-10">
              
              {/* Deal of the Day Spotlight */}
              {spotlightDeal && (
                <section aria-label="Deal of the Day">
                  <h2 className="text-2xl font-extrabold text-charcoal mb-6 flex items-center gap-3">
                    <svg className="w-6 h-6 text-ember" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                    Deal of the Day
                  </h2>
                  <Link href={`/deals/${spotlightDeal.slug ?? spotlightDeal.id}`} className="block group">
                    <article className="bg-white rounded-3xl border border-border shadow-md overflow-hidden flex flex-col md:flex-row group-hover:border-ember transition-colors">
                      <div className="md:w-1/2 lg:w-[60%] relative aspect-video md:aspect-auto bg-surface-sunken overflow-hidden">
                        {spotlightDeal.image && (
                          <Image
                            src={spotlightDeal.image}
                            alt=""
                            fill
                            sizes="(max-width:768px) 100vw, 60vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="px-4 py-1.5 rounded-full bg-deal text-white text-sm font-extrabold uppercase tracking-wider shadow-lg">
                            {dealLabel(spotlightDeal)}
                          </span>
                        </div>
                      </div>
                      <div className="md:w-1/2 lg:w-[40%] p-8 md:p-12 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-4 text-deal font-bold text-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>Ends Soon</span>
                        </div>
                        <h3 className="text-3xl lg:text-4xl font-extrabold text-charcoal leading-tight mb-4 group-hover:text-ember transition-colors">
                          {spotlightDeal.name}
                        </h3>
                        {spotlightDeal.description && (
                          <p className="text-smoke-600 text-lg mb-8 leading-relaxed">
                            {spotlightDeal.description}
                          </p>
                        )}
                        <p className="text-4xl font-black text-deal mb-8">
                          {dealValueDisplay(spotlightDeal)}
                        </p>
                        
                        <div className="mt-auto">
                          <div className="flex justify-between text-xs font-bold text-smoke-500 mb-2">
                            <span>{getDealClaimedPercent(spotlightDeal.id)}% Claimed</span>
                          </div>
                          <div className="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-deal rounded-full" style={{ width: `${getDealClaimedPercent(spotlightDeal.id)}%` }} />
                          </div>
                          <span className="flex items-center justify-center w-full h-14 rounded-2xl bg-charcoal text-white font-extrabold text-base hover:bg-ember transition-colors">
                            Claim Deal Now
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </section>
              )}

              {/* Standard Deal Grid */}
              {regularDeals.length > 0 && (
                <section aria-label="More deals">
                  <h2 className="text-2xl font-extrabold text-charcoal mb-6">Lightning Deals</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
                    {regularDeals.map(deal => {
                      const claimed = getDealClaimedPercent(deal.id);
                      return (
                      <li key={deal.id}>
                        <Link href={`/deals/${deal.slug ?? deal.id}`} className="group h-full block">
                          <article className="h-full flex flex-col bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-ember transition-all duration-300">
                            {deal.image ? (
                              <div className="relative aspect-[4/3] w-full bg-surface-sunken overflow-hidden">
                                <Image
                                  src={deal.image}
                                  alt=""
                                  fill
                                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-3 left-3">
                                  <span className="px-3 py-1 rounded-md bg-deal text-white text-xs font-extrabold uppercase tracking-widest shadow-md">
                                    {dealLabel(deal)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                               <div className="relative aspect-[4/3] w-full bg-surface-raised flex items-center justify-center border-b border-border">
                                  <span className="px-3 py-1 rounded-md bg-deal text-white text-xs font-extrabold uppercase tracking-widest shadow-md">
                                    {dealLabel(deal)}
                                  </span>
                               </div>
                            )}

                            <div className="flex flex-col flex-1 p-5">
                              <h3 className="text-base font-extrabold text-charcoal leading-snug mb-2 group-hover:text-ember transition-colors line-clamp-2">
                                {deal.name}
                              </h3>
                              <p className="text-2xl font-black text-deal mb-4">
                                {dealValueDisplay(deal)}
                              </p>
                              
                              <div className="mt-auto">
                                <div className="flex justify-between text-[10px] font-bold text-smoke-500 uppercase tracking-wider mb-1.5">
                                  <span>{claimed}% Claimed</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden mb-4">
                                  <div className="h-full bg-deal rounded-full" style={{ width: `${claimed}%` }} />
                                </div>
                                <span className="flex items-center justify-center w-full h-10 rounded-xl bg-surface-raised text-charcoal font-bold text-sm border border-border group-hover:bg-charcoal group-hover:text-white transition-colors">
                                  View Deal
                                </span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      </li>
                    )})}
                  </ul>
                </section>
              )}

              {/* Promotional hero banner - Redesigned */}
              <section className="mt-24 rounded-3xl overflow-hidden relative bg-gradient-to-r from-ember-deep to-ember text-white shadow-2xl flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-12 gap-8" aria-label="Join Prime">
                <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full blur-3xl bg-white/10 pointer-events-none" />
                <div className="relative z-10 max-w-xl text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm mb-6 border border-white/20">
                     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Never Miss a Deal Again</h2>
                  <p className="text-white/80 text-lg leading-relaxed mb-8">
                    Download the Storegrill mobile app to get push notifications for lightning deals before they sell out. Available on iOS and Android.
                  </p>
                  <button className="px-8 py-3 rounded-xl bg-white text-ember font-extrabold text-sm shadow-xl hover:bg-white/90 transition-all inline-flex items-center gap-2">
                    Get the App
                  </button>
                </div>
                <div className="relative z-10 hidden md:block w-64 h-64 shrink-0 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md p-6 shadow-inner transform rotate-3">
                   {/* Abstract graphic representing the app */}
                   <div className="w-full h-full border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center flex-col gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="h-2 w-1/2 bg-white/30 rounded-full" />
                      <div className="h-2 w-3/4 bg-white/20 rounded-full" />
                   </div>
                </div>
              </section>
              
            </div>
          )}
        </div>
      </div>
    </WaitingRoomClient>
  );
}
