import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { API_BASE } from '@/lib/api';
import { buildMetadata, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { regionPromoContent } from '@/lib/region-content';
import { promoPalette } from '@/design-system/tokens';

import { ProductCard } from '@/components/commerce/ProductCard';
import {
  CategoryQuickNav,
  TrustBar,
  VendorSpotlight,
  CampaignHero,
  TabbedProductCarousel,
  CategoryBannerWithProducts,
  DealsOfTheDay,
  Testimonials,
  type DealCardData,
} from '@/components/home/Sections';

export const revalidate = 60;

interface PageProps {
  params: Record<string, never>;
}

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const meta = buildMetadata({
    title: 'Online Shopping for Electronics, Home, Fashion & More | Storegrill',
    description:
      'Shop millions of products from verified vendors on Storegrill. Local currency, fast regional delivery, secure Stripe & PayPal checkout and easy returns.',
    path: '/',
    regionKey,
    ogImage: '/banners/bannerOne.jpg',
  });
  return meta;
}

interface RawDealVariant {
  product: {
    id: string;
    name: string;
    slug: string;
    thumbnail?: string | null;
    basePriceMinorUnits: number;
    currencyCode: string;
    rating: number;
  };
}

interface RawDeal {
  id: string;
  name: string;
  type: string;
  value: number;
  maxDiscount?: number | null;
  endsAt: string;
  variants: RawDealVariant[];
}

function dealsToCards(deals: Array<Record<string, unknown>>): DealCardData[] {
  const cards: DealCardData[] = [];
  for (const raw of deals as unknown as RawDeal[]) {
    const label = raw.type === 'PERCENTAGE_OFF' ? `${raw.value}% OFF` : 'DEAL';
    for (const { product } of raw.variants) {
      const listPriceMinorUnits = product.basePriceMinorUnits;
      let discount = 0;
      if (raw.type === 'PERCENTAGE_OFF') {
        discount = Math.round((listPriceMinorUnits * raw.value) / 100);
        if (raw.maxDiscount) discount = Math.min(discount, raw.maxDiscount);
      } else if (raw.type === 'FIXED_AMOUNT') {
        discount = raw.value * 100;
      }
      const priceMinorUnits = Math.max(0, listPriceMinorUnits - discount);
      cards.push({
        id: `${raw.id}-${product.id}`,
        slug: product.slug,
        productId: product.id,
        productName: product.name,
        image: product.thumbnail ?? undefined,
        priceMinorUnits,
        listPriceMinorUnits,
        currencyCode: product.currencyCode,
        endsAt: raw.endsAt,
        dealLabel: label,
      });
    }
  }
  return cards
    .sort((a, b) => new Date(a.endsAt ?? 0).getTime() - new Date(b.endsAt ?? 0).getTime())
    .slice(0, 8);
}

interface FeaturedProduct {
  id: string;
  name: string;
  slug?: string;
  thumbnail?: string;
  images?: string[];
  price: number;
  basePriceMinorUnits?: number;
  listPriceMinorUnits?: number;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  vendor?: { storeName: string; slug: string } | null;
  description?: string;
  shortDescription?: string;
  category?: { name?: string } | null;
}

async function fetchHome(regionKey: string) {
  try {
    const [productsRes, dealsRes, vendorsRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/products/featured?regionKey=${regionKey}`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE}/api/v1/deals?regionKey=${regionKey}&enabled=true`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE}/api/v1/vendors?limit=3&status=ACTIVE`, { next: { revalidate: 300 } }),
    ]);
    const productsData = productsRes.ok ? await productsRes.json() as { products?: FeaturedProduct[] } : { products: [] as FeaturedProduct[] };
    const dealsData = dealsRes.ok ? await dealsRes.json().catch(() => ({ deals: [] as Array<Record<string, unknown>> })) as { deals?: Array<Record<string, unknown>> } : { deals: [] as Array<Record<string, unknown>> };
    const vendorsData = vendorsRes.ok ? await vendorsRes.json().catch(() => ({ vendors: [] as Array<Record<string, unknown>> })) as { vendors?: Array<Record<string, unknown>> } : { vendors: [] as Array<Record<string, unknown>> };
    const products: FeaturedProduct[] = (productsData.products ?? []).map(p => ({
      ...p,
      price: Number(p.basePriceMinorUnits ?? 0),
    }));
    return {
      products,
      deals: (dealsData.deals || []) as Array<Record<string, unknown>>,
      vendors: (vendorsData.vendors || []) as Array<Record<string, unknown>>,
      ok: true,
    };
  } catch {
    return { products: [], deals: [], vendors: [], ok: false };
  }
}

export default async function HomePage() {
  const { regionKey, language } = await getRequestContext();
  const { products, deals, vendors } = await fetchHome(regionKey);
  const localized = await localizeProducts(products.slice(0, 8), language);
  const promo = regionPromoContent(regionKey);
  const dealCards = dealsToCards(deals);

  return (
    <div className="bg-surface-raised">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <h1 className="sr-only">Storegrill — Shop millions of products from verified vendors</h1>

      {/* 1. Trust/USP strip */}
      <TrustBar freeShippingThreshold={promo.freeShippingThresholdMinorUnits} currency={promo.currency} />

      {/* 2. Hero */}
      <CampaignHero />

      {/* 3. Category navigation — surfaces marketplace breadth immediately */}
      <CategoryQuickNav />

      {/* 4. Live deals with real countdowns (renders nothing if none are active) */}
      <DealsOfTheDay deals={dealCards} />

      {/* 5. Merchandising carousel — New Arrivals / Best Sellers / Top Rated / On Sale */}
      <section className="py-8 md:py-10" aria-labelledby="products-heading">
        <div className="container-fluid">
          <TabbedProductCarousel
            tabs={[
              {
                label: 'New Arrivals',
                products: [...localized].reverse().map(product => (
                  <ProductCard key={`new-${product.id}`} product={{ ...product, listPrice: product.listPriceMinorUnits, vendor: product.vendor ?? undefined, badge: 'new' }} />
                )),
              },
              {
                label: 'Best Sellers',
                products: [...localized]
                  .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
                  .map(product => (
                    <ProductCard key={`best-${product.id}`} product={{ ...product, listPrice: product.listPriceMinorUnits, vendor: product.vendor ?? undefined, badge: 'bestseller' }} />
                  )),
              },
              {
                label: 'Top Rated',
                products: [...localized]
                  .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                  .map(product => (
                    <ProductCard key={`top-${product.id}`} product={{ ...product, listPrice: product.listPriceMinorUnits, vendor: product.vendor ?? undefined }} />
                  )),
              },
              {
                label: 'On Sale',
                products: localized
                  .filter(p => (p.listPriceMinorUnits ?? 0) > (p.basePriceMinorUnits ?? p.price ?? 0))
                  .map(product => (
                    <ProductCard key={`sale-${product.id}`} product={{ ...product, listPrice: product.listPriceMinorUnits, vendor: product.vendor ?? undefined, badge: 'sale' }} />
                  )),
              },
            ]}
          />
        </div>
      </section>

      {/* 6. Category deep-dive: Mobile Phones & Tablets */}
      <CategoryBannerWithProducts
        title="Mobile Phones & Tablets"
        subtitle="Verified vendors · buyer protection included"
        description="Flagship devices backed by Storegrill's 30-day returns and secure checkout."
        ctaLabel="Shop mobile & tablets"
        ctaHref="/products?category=mobiles"
        bannerImage="/banners/home4/banner-37.jpg"
        bannerBg={promoPalette.harbor}
        products={localized.slice(0, 6).map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          thumbnail: p.thumbnail,
          price: p.price,
          listPrice: p.listPriceMinorUnits,
          currencyCode: p.currencyCode,
          rating: p.rating,
          reviewCount: p.reviewCount,
          vendor: p.vendor ?? null,
        }))}
      />

      {/* 7. Vendor spotlight — the marketplace differentiator */}
      <VendorSpotlight
        vendors={vendors.map(v => ({
          storeName: String(v.storeName),
          slug: String(v.slug),
          rating: Number(v.rating || 0),
          reviewCount: Number(v.reviewCount || 0),
          logo: v.logo ? String(v.logo) : undefined,
          description: v.description ? String(v.description) : undefined,
        }))}
      />

      {/* 8. Social proof */}
      <Testimonials />

    </div>
  );
}


