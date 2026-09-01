import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { API_BASE } from '@/lib/api';
import { buildMetadata, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { regionPromoContent, regionConfig, heroSlidesFor, categoryBannerFor, vendorSpotlightFor } from '@/lib/region-content';
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
  RecommendedForYou,
  AppDownloadBanner,
  RegionalTrust,
  BrandLogoBar,
  PromoBanner3Up,
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
  const regionCfg = regionConfig(regionKey);

  const dealTicker = dealCards.slice(0, 6).map(d => ({
    label: `${d.dealLabel}: ${d.productName}`,
    href: d.slug ? `/products/${d.slug}` : d.productId ? `/products/${d.productId}` : '/deals',
  }));

  const testimonials = [
    { name: 'Amara O.', role: 'Verified buyer · Lagos', avatar: '/avatars/avatar-1.jpg', quote: 'Fast delivery, exactly as described. Storegrill is now my go-to for electronics. Buyer protection gave me real peace of mind.' },
    { name: 'James K.', role: 'Verified buyer · London', avatar: '/avatars/avatar-2.jpg', quote: 'Found a deal on a Sony camera that was 25% cheaper than everywhere else. Arrived next day. Absolutely brilliant.' },
    { name: 'Priya S.', role: 'Verified buyer · Mumbai', avatar: '/avatars/avatar-3.jpg', quote: 'The vendor rating system is great — I could see the seller\'s history before buying. Felt completely safe. Will definitely shop again.' },
    { name: 'Carlos M.', role: 'Verified buyer · Madrid', avatar: '/avatars/avatar-4.jpg', quote: '30-day return policy is no joke — I returned an item hassle-free. The team was responsive and the refund was instant.' },
    { name: 'Aisha B.', role: 'Verified buyer · Nairobi', avatar: '/avatars/avatar-5.jpg', quote: 'Great prices on fashion and beauty. Local currency pricing made it easy. I refer all my friends here now.' },
  ];

  return (
    <div className="bg-surface-raised">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <h1 className="sr-only">Storegrill — Shop millions of products from verified vendors</h1>

      {/* 1. Trust/USP strip */}
      <TrustBar freeShippingThreshold={promo.freeShippingThresholdMinorUnits} currency={promo.currency} />

      {/* 2. Hero — full-bleed split with deal ticker */}
      <CampaignHero dealTicker={dealTicker} />

      {/* 3. Brand logo marquee */}
      <BrandLogoBar />

      {/* 4. Category navigation */}
      <CategoryQuickNav />

      {/* 5. Live deals */}
      <DealsOfTheDay deals={dealCards} />

      {/* 6. Merchandising carousel */}
      <section className="py-16 md:py-24" aria-labelledby="products-heading">
        <div className="container-fluid">
          <TabbedProductCarousel
            tabs={[
              {
                label: 'What\'s Trending Right Now',
                products: [...localized]
                  .sort((a, b) => (b.rating ?? 0) * (b.reviewCount ?? 0) - (a.rating ?? 0) * (a.reviewCount ?? 0))
                  .map(product => (
                    <ProductCard key={`trending-${product.id}`} product={{ ...product, listPrice: product.listPriceMinorUnits, vendor: product.vendor ?? undefined, badge: 'trending' }} />
                  )),
              },
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

      {/* 7. Editorial 3-up promo banners */}
      <PromoBanner3Up />

      {/* 8. Recommended for you */}
      <RecommendedForYou
        products={localized.slice(0, 8).map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          thumbnail: p.thumbnail,
          price: p.price,
          listPrice: p.listPriceMinorUnits,
          currencyCode: p.currencyCode,
          rating: p.rating,
          reviewCount: p.reviewCount,
        }))}
      />

      {/* 9. Category deep-dive */}
      <CategoryBannerWithProducts
        {...categoryBannerFor(regionKey)}
        fromPrice={new Intl.NumberFormat('en-US', { style: 'currency', currency: promo.currency, minimumFractionDigits: 0 }).format(
          Math.min(...localized.map(p => p.price ?? 99900)) / 100
        )}
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

      {/* 10. App download CTA */}
      <AppDownloadBanner />

      {/* 11. Vendor spotlight */}
      <VendorSpotlight
        vendors={vendorSpotlightFor(regionKey).map(v => ({
          storeName: String(v.storeName),
          slug: String(v.slug),
          rating: Number(v.rating || 0),
          reviewCount: Number(v.reviewCount || 0),
          logo: v.logo ? String(v.logo) : undefined,
          description: v.description ? String(v.description) : undefined,
        }))}
      />

      {/* 12. Regional trust */}
      <RegionalTrust
        regionKey={regionKey}
        paymentMethods={regionCfg.paymentMethods}
        carriers={regionCfg.shippingZones[0]?.carriers ?? []}
      />

      {/* 13. Social proof */}
      <Testimonials items={testimonials} />

    </div>
  );
}
