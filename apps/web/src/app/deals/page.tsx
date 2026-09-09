import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata, SEO_DEFAULTS } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { t } from '@/i18n';
import { WaitingRoomClient } from './WaitingRoomClient';
import { DealsCatalogClient, DealProduct } from './DealsCatalogClient';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const seo = SEO_DEFAULTS.deals(regionKey);
  return buildMetadata({ title: seo.title, description: seo.description, keywords: seo.keywords, path: '/deals', regionKey, ogImage: '/banners/bannerThree.jpg' });
}

async function fetchDealsProducts(regionKey: string): Promise<{
  products: DealProduct[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/deals/products?regionKey=${regionKey}&filter=all&sort=savings&offset=0&limit=24`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { products: [], total: 0, hasMore: false };
  }
}

export default async function DealsPage() {
  const { regionKey, language } = await getRequestContext();
  const initial = await fetchDealsProducts(regionKey);

  return (
    <WaitingRoomClient>
      <div className="bg-surface-sunken min-h-screen pb-20">
        <header className="relative bg-gradient-to-br from-midnight via-ember-deep to-ember pt-12 pb-20 px-4 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.1) 40px,rgba(255,255,255,0.1) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.1) 40px,rgba(255,255,255,0.1) 41px)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-amber-400/10 to-transparent blur-3xl rounded-full translate-x-1/4" />

          <div className="container-fluid relative z-10">
            <div className="mb-8">
              <Breadcrumb items={[{ name: t(language, 'todaysDeals'), path: '' }]} regionKey={regionKey} />
            </div>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">{t(language, 'dealsLive')}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-5 leading-tight">
                {t(language, 'dealsPageTitle')}
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
                {t(language, 'dealsPageSubtitle')}
              </p>
            </div>
          </div>
        </header>

        <DealsCatalogClient
          regionKey={regionKey}
          language={language}
          initialProducts={initial.products}
          initialTotal={initial.total}
          initialHasMore={initial.hasMore}
        />
      </div>
    </WaitingRoomClient>
  );
}