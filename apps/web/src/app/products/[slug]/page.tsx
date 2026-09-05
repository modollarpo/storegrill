import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts, translateBatch } from '@/lib/server-translate';
import { buildMetadata, productJsonLd, SEO_DEFAULTS } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { DEFAULT_REGIONS } from '@Storegrill/shared';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { ProductDetailClient } from '@/components/commerce/ProductDetailClient';
import { Tabs } from '@/components/navigation/Tabs';
import { Accordion } from '@/components/ui/Accordion';
import { ReviewsTab } from '@/components/feedback/ReviewsTab';
import { ProductCard, type ProductCardData } from '@/components/commerce/ProductCard';
import { FrequentlyBoughtTogether } from '@/components/commerce/FrequentlyBoughtTogether';
import { RecentlyViewed, TrackRecentlyViewed } from '@/components/commerce/RecentlyViewed';
import { TrendingSlider } from '@/components/home/Sections';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';

export const revalidate = 30;

interface PdpProps {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string, regionKey: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${slug}?regionKey=${regionKey}`, {
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PdpProps): Promise<Metadata> {
  const { slug } = await params;
  const { regionKey } = await getRequestContext();
  const data = await fetchProduct(slug, regionKey);
  if (!data?.product) {
    return buildMetadata({ title: 'Product not found', description: 'This product is unavailable.', path: `/products/${slug}`, regionKey, noIndex: true });
  }
  const product = data.product;
  const localized = await localizeProducts([product], 'en');
  const localizedProduct = localized[0];
  const priceMinorUnits = localizedProduct.price;
  const currencyCode = localizedProduct.currencyCode;
  const decimals = currencyCode === 'JPY' ? 1 : 100;
  const price = (priceMinorUnits / decimals).toFixed(2);
  const rating = localizedProduct.rating ?? undefined;
  const reviewCount = localizedProduct.reviewCount ?? undefined;
  const title = localizedProduct.name.slice(0, 60);
  const defaultDesc = `Buy ${localizedProduct.name} on Storegrill. Check price, availability, reviews and delivery options from verified sellers.`;
  const desc = localizedProduct.shortDescription
    ? `${localizedProduct.shortDescription.slice(0, 300)}. ${defaultDesc}`
    : SEO_DEFAULTS.product(localizedProduct.name, price, currencyCode, rating, reviewCount).description;
  const meta = buildMetadata({
    title,
    description: desc,
    path: `/products/${slug}`,
    regionKey,
    ogImage: localizedProduct.thumbnail || undefined,
  });
  return meta;
}

export default async function ProductPage({ params }: PdpProps) {
  const { slug } = await params;
  const { regionKey, language } = await getRequestContext();
  const data = await fetchProduct(slug, regionKey);

  if (!data?.product) notFound();

  let product = data.product;
  [product] = await localizeProducts([product], language);

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === regionKey);
  const zone = regionConfig?.shippingZones[0];
  const shipping = {
    freeThresholdMinorUnits: zone?.freeShippingThresholdMinorUnits ?? 3500,
    daysMin: zone?.estimatedDaysMin ?? 3,
    daysMax: zone?.estimatedDaysMax ?? 7,
  };

  const companionsRes = await fetch(`${API_BASE}/api/v1/products/${encodeURIComponent(product.slug || product.id)}/companions?regionKey=${regionKey}&limit=8`, { next: { revalidate: 300 } }).catch(() => null);
  const companionsData = companionsRes && companionsRes.ok ? await companionsRes.json().catch(() => ({ companions: [] })) : { companions: [] };
  interface CompanionItem { id: string; slug: string; name: string; priceMinorUnits: number; currencyCode: string; thumbnail: string | null; rating: number; reviewCount: number; inStock: boolean; reason: string; vendorName?: string | null; vendorSlug?: string | null; }
  const companions: CompanionItem[] = (companionsData.companions || []) as CompanionItem[];

  const relatedRes = await fetch(`${API_BASE}/api/v1/products?regionKey=${regionKey}&category=${product.category?.slug ?? ''}&limit=8`, { next: { revalidate: 300 } }).catch(() => null);
  const relatedData = relatedRes && relatedRes.ok ? await relatedRes.json().catch(() => ({ products: [] })) : { products: [] };
  const relatedBase = ((relatedData.products || []) as ProductCardData[]).filter(p => p.id !== product.id).slice(0, 8);

  const bundleCompanions: Array<{ id: string; slug?: string; name: string; unitPriceMinorUnits: number; currencyCode: string; thumbnail: string | null }> =
    companions.length > 0
      ? companions
          .filter(c => c.inStock && (c.reason === 'authored' || c.reason === 'similar'))
          .slice(0, 2)
          .map(c => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            unitPriceMinorUnits: Number(c.priceMinorUnits),
            currencyCode: String(c.currencyCode),
            thumbnail: c.thumbnail ?? null,
          }))
      : [...relatedBase]
          .filter(p => p.price <= product.price * 2)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 2)
          .map(p => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            unitPriceMinorUnits: Number(p.price),
            currencyCode: String(p.currencyCode),
            thumbnail: p.thumbnail ?? null,
          }));

  const companionIds = new Set(bundleCompanions.map(c => c.id));
  const related: ProductCardData[] = companions.length > 0
    ? companions.filter(c => c.inStock && c.reason === 'similar' && !companionIds.has(c.id)).slice(0, 8).map(c => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        thumbnail: c.thumbnail ?? undefined,
        price: c.priceMinorUnits,
        currencyCode: c.currencyCode,
        rating: c.rating,
        reviewCount: 0,
        inventoryCount: c.inStock ? 1 : 0,
        vendor: c.vendorName && c.vendorSlug ? { storeName: c.vendorName, slug: c.vendorSlug } : null,
      }))
    : relatedBase;

  const protectionTiers = [
    { id: 'care-1', title: '1 year StoreCare protection', months: 12 },
    { id: 'care-3', title: '3 year StoreCare protection', months: 36 },
  ].map(tier => {
    const rate = tier.months === 12 ? 0.1 : 0.18;
    return { ...tier, priceMinorUnits: Math.max(499, Math.round((product.price * rate) / 10) * 10 - 1) };
  });

  const reviewTexts = [
    'Product description',
    'Specifications',
    'Shipping & Returns',
    `Customer reviews (${product.reviewCount})`,
  ];
  const translatedTabs = await translateBatch(reviewTexts, language);

  const reviewsRes = await fetch(`${API_BASE}/api/v1/reviews/product/${encodeURIComponent(product.id)}?page=1&limit=8`, { next: { revalidate: 60 } }).catch(() => null);
  const reviewsData = reviewsRes && reviewsRes.ok ? await reviewsRes.json().catch(() => null) : null;
  const reviewSource = (((reviewsData as { reviews?: unknown[] } | null)?.reviews) || (product as Record<string, unknown>).reviews || []) as Array<Record<string, unknown>>;
  const reviewAverage = ((reviewsData as { stats?: { average?: number } } | null)?.stats?.average) ?? product.rating ?? 0;
  const reviewTotal = ((reviewsData as { stats?: { total?: number } } | null)?.stats?.total) ?? product.reviewCount ?? reviewSource.length;
  const reviewDistribution = ((((reviewsData as { stats?: { distribution?: Array<{ rating: number; count: number }> } } | null)?.stats?.distribution) || [])).map(d => ({ stars: d.rating, count: d.count }));
  const reviewInitial = reviewSource.map(r => ({
    id: String(r.id),
    authorName: String(
      (r.user as Record<string, unknown> | undefined)?.name ||
      (r.authorName as string | undefined) ||
      'Verified Storegrill customer'
    ),
    createdAt: String(r.createdAt),
    rating: Number(r.rating),
    title: r.title ? String(r.title) : undefined,
    body: r.body ? String(r.body) : undefined,
    verified: Boolean(r.verified),
    vendorReply: r.vendorReply ? String(r.vendorReply) : undefined,
    images: Array.isArray(r.images)
      ? (r.images as string[])
      : typeof r.images === 'string'
        ? (() => { try { const p = JSON.parse(r.images as string); return Array.isArray(p) ? (p as string[]) : []; } catch { return []; } })()
        : [],
  }));

  const freeShipFmt = new Intl.NumberFormat(language, { style: 'currency', currency: String(product.currencyCode) }).format(shipping.freeThresholdMinorUnits / 100);

  const pdpRecord = product as unknown as Record<string, unknown>;
  const tags = (pdpRecord.tags as string[] | undefined) || [];
  const inStock = (product.inventoryCount ?? 0) > 0;
  const freeShipEligible = Number(product.price) >= shipping.freeThresholdMinorUnits;

  return (
    <div className="container-site py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd(
              {
                id: product.id,
                name: product.name,
                description: product.description,
                image: product.images || [],
                priceMinorUnits: product.price,
                currencyCode: product.currencyCode,
                rating: product.rating,
                reviewCount: product.reviewCount,
                vendorName: product.vendor?.storeName,
                slug: product.slug,
                inStock: (product.inventoryCount ?? 0) > 0,
              },
              regionKey
            )
          ),
        }}
      />

      <Breadcrumb
        items={[
          ...(product.category ? [{ name: product.category.name, path: `/products?category=${product.category.slug}` }] : []),
          { name: product.name.slice(0, 40), path: '' },
        ]}
        regionKey={regionKey}
      />

      <ProductDetailClient
        product={product}
        shipping={shipping}
        locale={language}
        tabs={{
          description: (
            <Accordion
              variant="card"
              allowMultiple={false}
              items={[
                {
                  id: 'description',
                  title: (
                    <span className="flex items-center gap-2 text-base font-extrabold text-text-primary">
                      <DescriptionIcon />
                      {translatedTabs[0]}
                    </span>
                  ),
                  defaultOpen: true,
                  children: (
                    <div id="reviews-tab-anchor">
                      {product.shortDescription && (
                        <p className="text-base font-semibold text-text-primary leading-relaxed">{product.shortDescription}</p>
                      )}
                      <div className="mt-4 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                        {product.description || product.shortDescription || 'No description provided by the seller.'}
                      </div>
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {product.brand?.name && (
                          <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                            <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Brand</p>
                            <p className="mt-0.5 text-sm font-semibold text-text-primary">{product.brand.name}</p>
                          </div>
                        )}
                        {product.category?.name && (
                          <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                            <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Category</p>
                            <p className="mt-0.5 text-sm font-semibold text-text-primary">{product.category.name}</p>
                          </div>
                        )}
                        <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                          <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Delivery</p>
                          <p className="mt-0.5 text-sm font-semibold text-text-primary">{shipping.daysMin}–{shipping.daysMax} days</p>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                          <p className="text-2xs font-extrabold uppercase tracking-wide text-text-tertiary">Stock</p>
                          <p className="mt-0.5 text-sm font-semibold text-text-primary">{inStock ? 'In stock' : 'Unavailable'}</p>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-xs font-extrabold uppercase tracking-wide text-text-tertiary mb-2">Key details</h3>
                          <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <span key={tag} className="inline-flex items-center rounded-xs bg-surface-sunken border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'specs',
                  title: (
                    <span className="flex items-center gap-2 text-base font-extrabold text-text-primary">
                      <SpecsIcon />
                      {translatedTabs[1]}
                    </span>
                  ),
                  children: <SpecsSections product={product as unknown as Record<string, unknown>} />,
                },
                {
                  id: 'shipping',
                  title: (
                    <span className="flex items-center gap-2 text-base font-extrabold text-text-primary">
                      <ShippingIcon />
                      {translatedTabs[2]}
                    </span>
                  ),
                  children: (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="shipping-tab">
                      <ShippingCard
                        icon={<TruckIcon />}
                        title="Delivery"
                        tone="ember"
                      >
                        <p className="text-2xs text-text-tertiary mb-1.5">Estimated arrival</p>
                        <p className="text-sm font-bold text-text-primary">{shipping.daysMin}–{shipping.daysMax} business days</p>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                          {freeShipEligible
                            ? 'This item qualifies for free standard shipping.'
                            : `Free standard shipping on orders over ${freeShipFmt}.`}
                        </p>
                      </ShippingCard>
                      <ShippingCard
                        icon={<RotateIcon />}
                        title="Returns"
                        tone="success"
                      >
                        <p className="text-2xs text-text-tertiary mb-1.5">Return window</p>
                        <p className="text-sm font-bold text-text-primary">30-day free returns</p>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                          {product.vendor?.returnPolicy || 'Covers items returned in original condition within 30 days of delivery.'}
                        </p>
                      </ShippingCard>
                      <ShippingCard
                        icon={<ShieldIcon />}
                        title="Protection"
                        tone="charcoal"
                      >
                        <p className="text-2xs text-text-tertiary mb-1.5">Buyer protection</p>
                        <p className="text-sm font-bold text-text-primary">{product.category?.name || 'Every' } order is protected</p>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                          Regional warehouse dispatch with no surprise customs duties or fees.
                        </p>
                      </ShippingCard>
                    </div>
                  ),
                },
                {
                  id: 'reviews',
                  title: (
                    <span className="flex items-center gap-2 text-base font-extrabold text-text-primary">
                      <ReviewsIcon />
                      {translatedTabs[3]}
                    </span>
                  ),
                  badge: product.reviewCount,
                  children: (
                    <div id="reviews-tab" aria-label="Customer reviews">
                      <ReviewsTab
                        productId={product.id}
                        initial={reviewInitial}
                        average={reviewAverage}
                        total={reviewTotal}
                        distribution={reviewDistribution}
                        locale={language}
                      />
                    </div>
                  ),
                },
              ]}
            />
          ),
          specs: null as unknown as React.ReactNode,
          shippingInfo: null as unknown as React.ReactNode,
          reviews: null as unknown as React.ReactNode,
        }}
      />

      {bundleCompanions.length >= 2 && (
        <FrequentlyBoughtTogether
          main={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            unitPriceMinorUnits: Number(product.price),
            currencyCode: String(product.currencyCode),
            thumbnail: product.thumbnail ?? null,
          }}
          companions={bundleCompanions}
        />
      )}

      <section className="rounded-xl border border-border bg-surface p-6 mt-8 max-w-2xl shadow-sm" aria-labelledby="care-heading">
        <h2 id="care-heading" className="text-base font-bold text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-action-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
          Protect your new {product.name.split(' ').slice(0, 3).join(' ')}
        </h2>
        <ul className="mt-4 grid sm:grid-cols-2 gap-4">
          {protectionTiers.map(tier => (
            <li key={tier.id} className="rounded-lg border border-border bg-surface-sunken p-4 hover:border-action-primary transition-colors">
              <p className="text-sm font-bold text-text-primary">{tier.title}</p>
              <p className="mt-2 text-base font-extrabold text-text-primary">
                <PriceDisplay amountMinorUnits={tier.priceMinorUnits} currencyCode={String(product.currencyCode)} size="sm" />
              </p>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">Accidental damage &amp; mechanical breakdown cover. Available at checkout for eligible products.</p>
            </li>
          ))}
        </ul>
      </section>

      <TrackRecentlyViewed
        item={{
          slug: product.slug,
          name: product.name,
          unitPriceMinorUnits: Number(product.price),
          listPriceMinorUnits: product.listPriceMinorUnits ? Number(product.listPriceMinorUnits) : undefined,
          currencyCode: String(product.currencyCode),
          thumbnail: product.thumbnail || undefined,
        }}
      />

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-heading-lg font-bold text-text-primary mb-6">You may also like</h2>
          <TrendingSlider>
            {related.map(p => (
              <ProductCard key={p.id} product={p} locale={language} />
            ))}
          </TrendingSlider>
        </section>
      )}

      <RecentlyViewed currentSlug={product.slug} />
    </div>
  );
}

function SpecsSections({ product }: { product: Record<string, unknown> }) {
  const brand = (product.brand as { name?: string } | null | undefined)?.name;
  const category = (product.category as { name?: string } | null | undefined)?.name;
  const attrs = (product.attributes as Array<{ name: string; value: string }> | undefined) || [];

  const identityRows: Array<[string, string]> = [];
  if (brand) identityRows.push(['Brand', brand]);
  if (product.sku) identityRows.push(['SKU', String(product.sku)]);

  const physicalRows: Array<[string, string]> = [];
  if (product.weightGrams) physicalRows.push(['Weight', `${product.weightGrams} g`]);
  if (product.dimensions) physicalRows.push(['Dimensions', String(product.dimensions)]);

  const featureRows: Array<[string, string]> = attrs.map(a => [a.name, a.value]);

  const sections: Array<{ title: string; rows: Array<[string, string]> }> = [
    ...(identityRows.length ? [{ title: 'Product identity', rows: identityRows }] : []),
    ...(physicalRows.length ? [{ title: 'Physical specifications', rows: physicalRows }] : []),
    ...(featureRows.length ? [{ title: 'Features & options', rows: featureRows }] : []),
    ...(category ? [{ title: 'Classification', rows: [['Category', category] as [string, string]] }] : []),
  ];

  if (sections.length === 0) {
    return <p className="text-sm text-text-secondary">No specifications listed by the seller yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="specs-tab">
      {sections.map(section => (
        <section key={section.title} aria-label={section.title}>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-text-tertiary border-b border-smoke-150 pb-2 mb-3">{section.title}</h3>
          <dl className="divide-y divide-smoke-100">
            {section.rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-4 py-2.5 text-sm">
                <dt className="text-text-tertiary pr-2">{label}</dt>
                <dd className="text-text-primary font-medium text-left break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function ShippingCard({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: 'ember' | 'success' | 'charcoal'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    ember: 'bg-ember-pale text-ember',
    success: 'bg-feedback-success-bg text-feedback-success',
    charcoal: 'bg-smoke-100 text-charcoal',
  };
  return (
    <div className="rounded-lg border border-border bg-surface-sunken p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-md ${tones[tone]}`} aria-hidden="true">{icon}</div>
      <h3 className="mt-3 text-sm font-bold text-text-primary">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DescriptionIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
  );
}

function SpecsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 0M10 8h11M3 16h3.5M10 16h11M6.75 5v2.5M6.75 14.5V17"/></svg>
  );
}

function ShippingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h10l2 4v7h-2M8 6v11h7m-7-11H4v11h4m10 0a2 2 0 100-.001M9 17a2 2 0 100-.001"/></svg>
  );
}

function ReviewsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7"/></svg>
  );
}

function TruckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 100-4 2 2 0 000 4zm10-0a2 2 0 100-4 2 2 0 000 4z"/></svg>
  );
}

function RotateIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4v6h6M21 20v-6h-6M3 10a9 9 0 0115.5-3.6L21 10M21 14a9 9 0 01-15.5 3.6L3 14"/></svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3zM9 12l2 2 4-4"/></svg>
  );
}
