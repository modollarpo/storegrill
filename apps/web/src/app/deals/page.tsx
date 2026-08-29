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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode || 'USD' }).format(deal.value / 100) + ' off';
}

export default async function DealsPage() {
  const { regionKey, language } = await getRequestContext();
  const data = await fetchDeals(regionKey);
  let deals: DealRow[] = Array.isArray(data.deals) ? data.deals : [];

  if (deals.length > 0 && language !== 'en') {
    const translated = await translateBatch(deals.map(d => d.name || ''), language);
    deals = deals.map((d, i) => ({ ...d, name: translated[i] || d.name }));
  }

  return (
    <WaitingRoomClient>
      <div className="container-site py-6">
        <Breadcrumb items={[{ name: "Today's Deals", path: '' }]} regionKey={regionKey} />


      {/* Page hero header */}
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
            Today&apos;s Deals
          </h1>
          <Badge variant="danger" dot pulse>Live</Badge>
        </div>
        <p className="text-base text-text-secondary max-w-2xl leading-relaxed">
          Limited-time offers across every category — refreshed daily for your region. Prices shown in local currency.
        </p>
      </header>

      {deals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-sunken p-20 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-surface mx-auto mb-6 grid place-items-center shadow-sm">
            <svg className="w-10 h-10 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <p className="text-xl font-extrabold text-text-primary">No active deals right now</p>
          <p className="text-sm text-text-secondary mt-2">New deals drop every morning — check back soon.</p>
          <Link
            href="/products"
            className="inline-flex items-center h-11 px-8 mt-8 rounded-pill bg-action-primary text-action-primary-fg font-bold text-sm hover:brightness-110 transition-all"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
          {deals.map(deal => (
            <li key={deal.id}>
              <article className="group relative h-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-card-hover hover:border-action-primary transition-all duration-300">
                {/* Deal image band */}
                {deal.image && (
                  <div className="relative aspect-[16/7] w-full bg-surface-sunken overflow-hidden">
                    <Image
                      src={deal.image}
                      alt=""
                      fill
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex flex-col flex-1 p-5">
                  {/* Badge + expiry row */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="danger" size="md">{dealLabel(deal)}</Badge>
                    {deal.endsAt && (
                      <time className="text-xs font-medium text-text-tertiary" dateTime={new Date(deal.endsAt).toISOString()}>
                        Ends {new Date(deal.endsAt).toLocaleDateString(language === 'en' ? 'en-US' : language, { month: 'short', day: 'numeric' })}
                      </time>
                    )}
                  </div>

                  {/* Deal name */}
                  <h2 className="text-base font-extrabold text-text-primary leading-snug mb-1.5 group-hover:text-action-primary transition-colors">
                    {deal.name}
                  </h2>

                  {deal.description && (
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2 leading-relaxed">{deal.description}</p>
                  )}

                  {/* Saving callout */}
                  <p className="mt-4 text-2xl font-extrabold text-action-primary">
                    {dealValueDisplay(deal)}
                  </p>

                  {/* CTA */}
                  <Link
                    href={`/deals/${deal.slug ?? deal.id}`}
                    className="mt-auto pt-4 flex items-center justify-center h-11 rounded-pill border-2 border-action-primary text-action-primary font-extrabold text-sm hover:bg-action-primary hover:text-action-primary-fg transition-all"
                  >
Shop the deal →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {/* Promotional hero banner */}
      <section className="mt-14 rounded-2xl overflow-hidden relative h-64 bg-text-primary shadow-xl" aria-label="Deal of the day promo">
        <Image
          src="/banners/bannerTwo.jpg"
          alt=""
          fill
          sizes="(min-width:1024px) 1500px, 100vw"
          className="object-cover opacity-60"
          priority={false}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-16">
          <p className="text-sm font-bold text-white/70 uppercase tracking-widest mb-2">Lowest prices guaranteed</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white max-w-lg leading-tight">
            Flash prices.<br />Zero compromises.
          </h2>
          <Link
            href="/products?sort=price_asc"
            className="inline-flex items-center h-12 px-8 mt-6 w-fit rounded-pill bg-surface-raised text-text-primary font-extrabold text-sm hover:bg-action-primary hover:text-action-primary-fg transition-all shadow-lg"
          >
Shop lowest prices →
          </Link>
        </div>
      </section>
      </div>
    </WaitingRoomClient>
  );
}
