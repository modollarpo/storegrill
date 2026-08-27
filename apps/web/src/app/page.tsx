import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { API_BASE } from '@/lib/api';
import { buildMetadata, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { regionPromoContent } from '@/lib/region-content';

import { ProductCard } from '@/components/commerce/ProductCard';
import {
  CategoryQuickNav,
  TrustBar,
  VendorSpotlight,
  CampaignHero,
  BrandLogos,
  TabbedProductCarousel,
  CouponBanner,
  ThreeColumnBanners,
  CashBackBanner,
  CategoryBannerWithProducts,
  PromoBlockWithImages,
  BlogPosts,
  Testimonials,
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

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <h1 className="sr-only">Storegrill — Shop millions of products from verified vendors</h1>

      {/* 1. Trust/USP Strip */}
      <TrustBar freeShippingThreshold={promo.freeShippingThresholdMinorUnits} currency={promo.currency} />

      {/* 2. Hero Banners */}
      <CampaignHero />

      {/* 3. Brand Logo Carousel */}
      <BrandLogos />

      {/* Percent pattern divider */}
      <div className="w-full overflow-hidden leading-none" aria-hidden="true">
        <img src="/patter-percent-gray.svg" alt="" className="w-full h-auto" />
      </div>

      {/* 4. Coupon Banner (Bevesi "Winter Sale" slot) */}
      <CouponBanner
        title="Summer Sale"
        couponCode={promo.couponCode}
        description={`Up to ${promo.couponDiscountPercent}% discount offers along with unlimited campaigns and deals`}
        ctaLabel="Discover More"
        ctaHref="/deals"
      />

      {/* 5. Limited Campaign: Tabbed Product Carousel */}
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

      {/* 6. Three-Column Promo Banners */}
      <ThreeColumnBanners
        items={[
          {
            href: '/products?category=electronics',
            title: 'Where Innovation Meets Electronics',
            subtitle: 'Only this week. Don\'t miss...',
            description: 'Spark the Future Shop the Latest in Electronics',
            cta: 'Shop Now',
            image: '/banners/home4/banner-34.jpg',
            bgColor: '#5F1616',
          },
          {
            href: '/products?category=computers',
            title: 'Your Gateway to Tech Excellence',
            subtitle: 'Only This Week',
            description: 'There Is No Sore It Will Not Heal, No Electronics We Cannot Fix',
            cta: 'Shop Now',
            image: '/banners/home4/banner-35.jpg',
            bgColor: '#26525C',
          },
          {
            href: '/products?category=electronics',
            title: 'The Too Good To Hurry Electronics.',
            subtitle: 'Only this week. Don\'t miss...',
            description: 'Spark the Future Shop the Latest in Electronics',
            cta: 'Shop Now',
            image: '/banners/home4/banner-36.jpg',
            bgColor: '#323E4D',
          },
        ]}
      />

      {/* 7. Cash-Back Text Banner */}
      <CashBackBanner
        title="Return Cash Back"
        description={`Earn ${promo.cashbackPercent}% cash back on Storegrill. See if you're pre-approved with no credit risk.`}
        ctaLabel="Discover More"
        ctaHref="/payments"
      />

      {/* 8. Vendor Carousel */}
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

      {/* 10. Category Banner + Product Grid */}
      <CategoryBannerWithProducts
        title="Elevating Tech Solutions, Every Step of the Way"
        subtitle="Only this week. Don't miss..."
        description="Electrify Your World. Unleash the Power of Technology!"
        ctaLabel="Shop Now"
        ctaHref="/products?category=electronics"
        bannerImage="/banners/home4/banner-37.jpg"
        bannerBg="#1a3a4a"
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

      {/* 11. Promo Block with Dual Images */}
      <PromoBlockWithImages
        leftImage={{ src: '/banners/home4/banner-38.jpg', alt: 'Electronics promo' }}
        rightImage={{ src: '/banners/home4/banner-39.jpg', alt: 'Smart glasses' }}
        title="For the ultimate electronic repair experience"
        subtitle="Electronics Can Do."
        description="Discover our wide range of electronics repair services and accessories. Quality guaranteed."
        ctaLabel="Shop Now"
        ctaHref="/products?category=electronics"
      />

      {/* 12. Product Categories Carousel */}
      <CategoryQuickNav />

      {/* 13. Latest Blog Posts */}
      <BlogPosts
        posts={[
          {
            id: '1',
            title: 'Top 10 Gadgets You Need in 2026',
            excerpt: 'From smart home devices to wearables, these are the must-have gadgets of the year.',
            date: 'Aug 25, 2026',
            image: '/banners/offers/wk16-block-Sony-TVC.png',
            href: '/blog/top-gadgets-2026',
          },
          {
            id: '2',
            title: 'How to Choose the Right Laptop for Work',
            excerpt: 'A comprehensive guide to picking the perfect laptop based on your workflow needs.',
            date: 'Aug 22, 2026',
            image: '/banners/laptops/wk16-block-New-Term-HP.png',
            href: '/blog/choose-right-laptop',
          },
          {
            id: '3',
            title: 'Summer Tech Deals: What to Expect',
            excerpt: 'A preview of the biggest tech deals coming this summer across all categories.',
            date: 'Aug 18, 2026',
            image: '/banners/offers/wk16-block-Samsung-S26-watch-GWP.jpeg',
            href: '/blog/summer-tech-deals',
          },
        ]}
      />

      {/* 14. Testimonials */}
      <Testimonials />

    </div>
  );
}


