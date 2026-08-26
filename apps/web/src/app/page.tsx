import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { API_BASE } from '@/lib/api';
import { buildMetadata, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { ProductCard } from '@/components/commerce/ProductCard';
import { SkeletonProductGrid } from '@/components/ui/Skeleton';
import {
  CategoryQuickNav,
  DealsOfTheDay,
  TrustBar,
  RecentlyViewed,
  VendorSpotlight,
  CampaignHero,
  BrandLogos,
  PromoSlider,
  FeaturedCollections,
  TrendingSlider,
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
    const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
    const dealsData = dealsRes.ok ? await dealsRes.json().catch(() => ({ deals: [] })) : { deals: [] };
    const vendorsData = vendorsRes.ok ? await vendorsRes.json().catch(() => ({ vendors: [] })) : { vendors: [] };
    return {
      products: (productsData.products || []) as FeaturedProduct[],
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

  return (
    <div className="bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }} />

      <CampaignHero />

      <BrandLogos />

      <TrustBar />
      <CategoryQuickNav />

      <RecentlyViewed />

      <DealsOfTheDay
        deals={deals.slice(0, 8).map(d => {
          const variants = Array.isArray(d.variants) ? (d.variants as Array<Record<string, unknown>>) : [];
          const product = variants.length > 0 ? (variants[0].product as Record<string, unknown> | undefined) : undefined;
          return {
            id: String(d.id),
            slug: d.slug ? String(d.slug) : undefined,
            productId: product ? String(product.id) : undefined,
            productName: String(product?.name ?? d.name ?? ''),
            priceMinorUnits: Number(product?.basePriceMinorUnits ?? d.value ?? 0),
            listPriceMinorUnits: undefined,
            currencyCode: String(product?.currencyCode || d.currencyCode || 'GBP'),
            endsAt: d.endsAt ? String(d.endsAt) : undefined,
            dealLabel: d.type === 'FLASH_SALE' ? 'FLASH SALE' : 'DEAL',
            image: product?.thumbnail ? String(product.thumbnail) : undefined,
          };
        })}
      />

      <PromoSlider
        id="laptop"
        heading="Top marks deserve a top laptop!"
        subtitle="New-term deals from Lenovo, HP, Acer, ASUS and more"
        background="linear-gradient(to right, var(--color-ember-pale) 0%, rgba(242,235,251,0.55) 55%, rgba(242,235,251,0) 100%)"
        tiles={[
          { src: '/banners/laptops/wk16-block-New-Term-Lenovo-TV.png', label: 'Save up to £300 on Lenovo laptops', href: '/products?category=computers&q=lenovo' },
          { src: '/banners/laptops/wk16-block-New-Term-HP.png', label: 'Save up to £200 on HP laptops', href: '/products?category=computers&q=hp' },
          { src: '/banners/laptops/wk16-block-New-Term-Acer-Desktops-v1.png', label: 'Desktop deals from Acer', href: '/products?category=computers&q=acer' },
          { src: '/banners/laptops/wk11-block-ASUS-New-Term.png', label: 'Back-to-school picks by ASUS', href: '/products?category=computers&q=asus' },
          { src: '/banners/laptops/wk16-block-New-Term-Lenovo-Desktop-v1.png', label: 'Lenovo desktops for every desk', href: '/products?category=computers&q=lenovo+desktop' },
          { src: '/banners/laptops/wk16-block-New-Term-HP-Windows-TV-v1.png', label: 'Windows 11 laptops by HP', href: '/products?category=computers&q=hp+windows' },
          { src: '/banners/laptops/wk10-block-Intel-Funded-v4.png', label: 'Powered by Intel — shop the range', href: '/products?category=computers&q=intel' },
          { src: '/banners/laptops/wk16-block-New-Term-HP-ASOTV.png', label: 'As seen on TV: HP essentials', href: '/products?category=computers&q=hp' },
        ]}
      />

      <PromoSlider
        id="offers"
        heading="Discover our amazing offers"
        subtitle="Limited-time savings across home, tech and beauty"
        background="var(--color-surface)"
        tiles={[
          { src: '/banners/offers/wk15-block-HB-Dyson-Airwrap-Red.png', label: 'Dyson Airwrap — save on hair care', href: '/products?q=dyson' },
          { src: '/banners/offers/wk16-block-Bosch-BI-TV.png', label: 'Bosch — built for every home', href: '/products?q=bosch' },
          { src: '/banners/offers/wk16-block-LG-FOC.png', label: 'LG — free gifts with selected TVs', href: '/products?category=electronics&q=lg' },
          { src: '/banners/offers/wk16-block-Marvel-Wolverine-PRE-ORDER-v1.png', label: "Pre-order Marvel's Wolverine", href: '/products?category=toys&q=wolverine' },
          { src: '/banners/offers/wk16-block-Nespresso-ASOTV.png', label: 'As seen on TV: Nespresso', href: '/products?q=nespresso' },
          { src: '/banners/offers/wk16-block-New-term-homepage-promo-block.png', label: 'New term essentials', href: '/products?category=home' },
          { src: '/banners/offers/wk16-block-Samsung-S26-watch-GWP.jpeg', label: 'Samsung Galaxy Watch — gift with purchase', href: '/products?q=samsung+watch' },
          { src: '/banners/offers/wk16-block-Sony-TVC.png', label: 'Sony — as seen on TV', href: '/products?category=electronics&q=sony' },
        ]}
      />

      <PromoSlider
        id="brands"
        heading="Big brand deals"
        subtitle="Official ranges from Apple, Samsung, Google and more"
        background="var(--color-surface)"
        tiles={[
          { src: '/banners/brands/wk1-block-M365.png', label: 'Microsoft 365 — save on your plan', href: '/products?q=microsoft' },
          { src: '/banners/brands/wk44-block-Mobile-iPhone-Pro-BNPL6.jpeg', label: 'iPhone Pro — 6 months interest-free', href: '/products?q=iphone+pro' },
          { src: '/banners/brands/wk16-block-Samsung-Free-DR-TV.png', label: 'Samsung TVs with free delivery', href: '/products?category=electronics&q=samsung+tv' },
          { src: '/banners/brands/wk16-block-Beats-Studio-Pro.png', label: 'Beats Studio Pro — epic sound', href: '/products?q=beats' },
          { src: '/banners/brands/wk16-block-Google-smartwatch-NPL.png', label: 'Google smartwatches — new season', href: '/products?q=google+watch' },
          { src: '/banners/brands/wk16-block-Mega-Gaming-30off-Accs.png', label: 'Up to 30% off gaming accessories', href: '/products?q=gaming' },
          { src: '/banners/brands/wk13-block-CSWN-New-term-v1.jpeg', label: 'New term essentials', href: '/products?category=computers' },
          { src: '/banners/brands/wk16-block-TCL-TVC.png', label: 'As seen on TV: TCL', href: '/products?q=tcl' },
        ]}
      />

      <FeaturedCollections
        collections={[
          {
            icon: '/banners/featured/cheers/hot-icon-in-circle.png',
            title: 'Cheers!',
            subtitle: 'Get everything you need to enjoy summer drinks at home',
            aspect: 'aspect-[3/2]',
            tiles: [
              { src: '/banners/featured/cheers/wk3-featured-beer.jpeg', label: 'Shop our range of PerfectDraft beer machines', href: '/products?q=perfectdraft' },
              { src: '/banners/featured/cheers/wk3-featured-cocktails.jpeg', label: 'Bartesian Cocktail Maker', href: '/products?q=bartesian' },
            ],
          },
          {
            icon: '/banners/featured/New_Arrivals/new-icon-in-circle.png',
            title: 'New Arrivals',
            subtitle: 'The latest tech just landed!',
            tiles: [
              { src: '/banners/featured/New_Arrivals/wk12-featured-new-arrivals-lego-v1.jpeg', label: 'LEGO sets for every builder', href: '/products?category=toys&q=lego' },
              { src: '/banners/featured/New_Arrivals/wk12-featured-new-arrivals-smart-glasses-v1.jpeg', label: 'Smart glasses have landed', href: '/products?q=smart+glasses' },
            ],
          },
        ]}
      />

      <section className="border-b border-border py-10 md:py-12" aria-labelledby="featured-heading">
        <div className="container-fluid">
          <div className="flex items-end justify-between mb-6">
            <h2 id="featured-heading" className="text-2xl md:text-3xl font-bold text-text-primary">Popular Products</h2>
            <Link href="/products?sort=bestselling" className="inline-flex items-center min-h-[32px] px-1 text-sm font-bold text-action-primary hover:underline underline-offset-4">
              View all
            </Link>
          </div>
          <SuspenseGrid count={products.length}>
            <TrendingSlider>
              {localized.map(product => (
                <ProductCard key={product.id} product={{ ...product, vendor: product.vendor ?? undefined }} />
              ))}
            </TrendingSlider>
          </SuspenseGrid>
        </div>
      </section>

      <section className="pt-10 md:pt-12 pb-10 md:pb-12" aria-labelledby="sponsored-heading">
        <div className="container-fluid">
          <div className="flex items-end justify-between mb-6">
            <h2 id="sponsored-heading" className="text-2xl md:text-3xl font-bold text-text-primary">Sponsored products</h2>
            <Link href="/products" className="inline-flex items-center min-h-[32px] px-1 text-sm font-bold text-action-primary hover:underline underline-offset-4">
              View all
            </Link>
          </div>
          <SuspenseGrid count={products.length}>
            <TrendingSlider>
              {localized.map(product => (
                <ProductCard key={`sponsored-${product.id}`} product={{ ...product, vendor: product.vendor ?? undefined, sponsored: true }} />
              ))}
            </TrendingSlider>
          </SuspenseGrid>
        </div>
      </section>

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
    </div>
  );
}

function SuspenseGrid({ count, children }: { count: number; children: React.ReactNode }) {
  if (count === 0) {
    return (
      <div className="card bg-surface-sunken border border-border rounded-xs p-12 text-center">
        <p className="text-sm text-text-secondary font-medium">No products available in this region yet.</p>
        <Link href="/regions" className="text-xs font-bold text-action-primary hover:brightness-110 underline mt-3 inline-block">
          Browse other regions →
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

