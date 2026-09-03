import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { API_BASE } from '@/lib/api';
import { buildMetadata, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { regionPromoContent, regionConfig, categoryBannerFor } from '@/lib/region-content';

import { ProductCard, type ProductCardData } from '@/components/commerce/ProductCard';
import {
  CategoryQuickNav,
  TrustBar,
  VendorSpotlight,
  CampaignHero,
  TabbedProductCarousel,
  DealsOfTheDay,
  RecommendedForYou,
  RegionalTrust,
  BrandLogoBar,
  PromoBanner3Up,
  CategoryBannerWithProducts,
  Testimonials,
  AppDownloadBanner,
  FeaturedCollections,
  PromoSlider,
  type PromoBannerItem,
  type QuickNavItem,
  type DealCardData,
  type TestimonialItem,
  type FeaturedCollection,
  type PromoTile,
} from '@/components/home/Sections';

export const revalidate = 60;

const PROMO_GRADIENTS = [
  'from-ember-deep to-ember',
  'from-midnight to-charcoal',
  'from-tealink to-tealink',
];

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
  category?: { name?: string; slug?: string } | null;
}

interface RawVendor {
  id: string;
  storeName: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  rating: number;
  reviewCount: number;
  status: string;
}

interface HomeData {
  products: FeaturedProduct[];
  deals: Array<Record<string, unknown>>;
  vendors: RawVendor[];
  ok: boolean;
}

async function fetchHome(regionKey: string): Promise<HomeData> {
  try {
    const [productsRes, dealsRes, vendorsRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/products/featured?regionKey=${regionKey}`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE}/api/v1/deals?regionKey=${regionKey}&enabled=true`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE}/api/v1/vendors?limit=3&status=ACTIVE`, { next: { revalidate: 300 } }),
    ]);
    const productsData = productsRes.ok ? (await productsRes.json()) as { products?: FeaturedProduct[] } : { products: [] as FeaturedProduct[] };
    const dealsData = dealsRes.ok ? (await dealsRes.json().catch(() => ({ deals: [] as Array<Record<string, unknown>> }))) as { deals?: Array<Record<string, unknown>> } : { deals: [] as Array<Record<string, unknown>> };
    const vendorsData = vendorsRes.ok ? (await vendorsRes.json().catch(() => ({ vendors: [] as RawVendor[] }))) as { vendors?: RawVendor[] } : { vendors: [] as RawVendor[] };
    return {
      products: productsData.products ?? [],
      deals: dealsData.deals ?? [],
      vendors: vendorsData.vendors ?? [],
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

  const categoryRows = new Map<string, { name: string; slug: string; minPrice: number }>();
  for (const p of products) {
    const cat = p.category;
    if (!cat?.slug || !cat.name) continue;
    const price = p.price ?? 0;
    const existing = categoryRows.get(cat.slug);
    if (!existing) categoryRows.set(cat.slug, { name: cat.name, slug: cat.slug, minPrice: price });
    else if (price > 0 && (existing.minPrice === 0 || price < existing.minPrice)) existing.minPrice = price;
  }
  const availableCategories: QuickNavItem[] = Array.from(categoryRows.values())
    .filter(c => c.minPrice > 0)
    .map(c => ({ name: c.name, slug: c.slug }));

  const promoBanners: PromoBannerItem[] = categoryRows.size > 0
    ? Array.from(categoryRows.values())
        .filter(c => c.minPrice > 0)
        .sort((a, b) => b.minPrice - a.minPrice)
        .slice(0, 3)
        .map((c, i) => ({
          eyebrow: `Available in ${promo.currency}`,
          title: c.name,
          cta: `Shop ${c.name}`,
          href: `/products?category=${encodeURIComponent(c.slug)}`,
          bg: PROMO_GRADIENTS[i % PROMO_GRADIENTS.length],
          fromPriceMinorUnits: c.minPrice,
          currency: promo.currency,
        }))
    : [];

  const spotlightVendors = vendors
    .filter(v => v.status === 'ACTIVE')
    .slice(0, 3)
    .map(v => ({
      storeName: String(v.storeName),
      slug: String(v.slug),
      rating: Number(v.rating || 0),
      reviewCount: Number(v.reviewCount || 0),
      logo: v.logo ? String(v.logo) : undefined,
      description: v.description ? String(v.description) : undefined,
    }));

  const featuredCards: ProductCardData[] = localized.slice(0, 8).map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: p.thumbnail,
    price: p.price,
    listPrice: p.listPriceMinorUnits,
    currencyCode: p.currencyCode,
    rating: p.rating,
    reviewCount: p.reviewCount,
    vendor: p.vendor ?? undefined,
  }));

  const promoSlides: PromoTile[] = localized
    .filter(p => (p.thumbnail ?? p.images?.[0]))
    .slice(0, 8)
    .map(p => ({
      src: p.thumbnail ?? p.images?.[0] ?? '',
      label: p.name,
      href: `/products/${p.slug ?? p.id}`,
    }));

  const collections: FeaturedCollection[] = (() => {
    const byCat = new Map<string, FeaturedProduct[]>();
    for (const p of localized) {
      const catSlug = p.category?.slug;
      if (!catSlug || !(p.thumbnail ?? p.images?.[0])) continue;
      if (!byCat.has(catSlug)) byCat.set(catSlug, []);
      byCat.get(catSlug)!.push(p);
    }
    return [...byCat.entries()]
      .filter(([, prods]) => prods.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2)
      .map(([, prods]) => {
        const cat = prods[0].category;
        return {
          icon: prods[0].thumbnail ?? prods[0].images?.[0] ?? '',
          title: `${cat?.name ?? 'Collection'} picks`,
          subtitle: `Hand-picked ${(cat?.name ?? 'products').toLowerCase()} from trusted vendors`,
          tiles: prods.slice(0, 4).map(p => ({
            src: p.thumbnail ?? p.images?.[0] ?? '',
            label: p.name,
            href: `/products/${p.slug ?? p.id}`,
          })),
        };
      });
  })();

  const testimonials: TestimonialItem[] = [
    { name: 'Aisha M.', role: 'Verified buyer · UK', avatar: '/testimonials/avatar-1.png', quote: 'Delivery was faster than promised and the price beat every high street option. The order tracking updates were spot on.' },
    { name: 'Sam K.', role: 'Verified buyer · US', avatar: '/testimonials/avatar-2.png', quote: 'Ordered a laptop bundle and the “frequently bought together” picks saved me real money. Checkout in local currency made it painless.' },
    { name: 'Tina D.', role: 'Verified buyer · DE', avatar: '/testimonials/avatar-3.png', quote: 'Customer support resolved a sizing question within minutes. The regional shipping estimate was accurate to the day.' },
    { name: 'Luis N.', role: 'Verified buyer · US', avatar: '/testimonials/avatar-4.png', quote: 'Great variety of vendors under one roof. I compared two sellers on the same product and the reviews were really helpful.' },
    { name: 'Rebecca B.', role: 'Verified buyer · UK', avatar: '/testimonials/avatar-5.png', quote: 'The mobile app checkout took under a minute. I have reordered three times since and it has been flawless every time.' },
    { name: 'Chen P.', role: 'Verified buyer · AE', avatar: '/testimonials/avatar-6.png', quote: 'Transparent pricing and easy returns gave me confidence to try a new brand. It has become my go-to storefront.' },
  ];

  const categoryBanner = categoryBannerFor(regionKey);

  const fromMinorUnits = featuredCards.reduce((min, p) => (min === 0 || p.price < min ? p.price : min), 0);
  const fromPrice = fromMinorUnits > 0
    ? new Intl.NumberFormat(language, { style: 'currency', currency: promo.currency }).format(fromMinorUnits / 100)
    : undefined;

  return (
    <div className="bg-surface-raised">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <h1 className="sr-only">Storegrill — Shop millions of products from verified vendors</h1>

      <TrustBar freeShippingThreshold={promo.freeShippingThresholdMinorUnits} currency={promo.currency} />

      <CampaignHero dealTicker={dealTicker} regionKey={regionKey} />

      <BrandLogoBar />

      {availableCategories.length >= 4 && <CategoryQuickNav categories={availableCategories} />}

      <DealsOfTheDay deals={dealCards} />

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

      {promoSlides.length > 5 && (
        <PromoSlider
          id="trending-categories"
          heading="Trending this week"
          subtitle="Shop the styles and categories customers can't stop raving about"
          tiles={promoSlides}
        />
      )}

      <PromoBanner3Up banners={promoBanners} />

      {collections.length >= 2 && (
        <FeaturedCollections collections={collections} />
      )}

      <RecommendedForYou products={featuredCards} />

      <VendorSpotlight vendors={spotlightVendors} />

      {categoryBanner && featuredCards.length > 0 && (
        <CategoryBannerWithProducts
          title={categoryBanner.title}
          subtitle={categoryBanner.subtitle}
          description={categoryBanner.description}
          ctaLabel={categoryBanner.ctaLabel}
          ctaHref={categoryBanner.ctaHref}
          bannerImage={categoryBanner.bannerImage}
          bannerBg={categoryBanner.bannerBg}
          fromPrice={fromPrice}
          products={featuredCards}
        />
      )}

      <Testimonials items={testimonials} />

      <RegionalTrust
        regionKey={regionKey}
        paymentMethods={regionCfg.paymentMethods}
        carriers={regionCfg.shippingZones[0]?.carriers ?? []}
      />

      <AppDownloadBanner />
    </div>
  );
}
