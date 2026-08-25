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
import { ReviewSummary, ReviewCard } from '@/components/feedback/Reviews';
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

  const relatedRes = await fetch(`${API_BASE}/api/v1/products?regionKey=${regionKey}&category=${product.category?.slug ?? ''}&limit=8`, { next: { revalidate: 300 } }).catch(() => null);
  const relatedData = relatedRes && relatedRes.ok ? await relatedRes.json().catch(() => ({ products: [] })) : { products: [] };
  const related = ((relatedData.products || []) as ProductCardData[]).filter(p => p.id !== product.id).slice(0, 8);

  const bundleCompanions = [...related]
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
                inStock: true,
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
        product={{ ...product, inventoryCount: 25 }}
        shipping={shipping}
        locale={language}
        tabs={{
          description: (
            <Tabs
              initial="description"
              items={[
                {
                  id: 'description',
                  label: translatedTabs[0],
                  content: (
                    <div className="max-w-prose text-sm text-text-secondary leading-relaxed whitespace-pre-line" id="reviews-tab-anchor">
                      {product.description || product.shortDescription || 'No description provided by the seller.'}
                    </div>
                  ),
                },
                {
                  id: 'specs',
                  label: translatedTabs[1],
                  content: <SpecsTable product={product} />,
                },
                {
                  id: 'shipping',
                  label: translatedTabs[2],
                  content: (
                    <div className="max-w-prose text-sm text-text-secondary space-y-3 leading-relaxed">
                      <p><strong className="text-text-primary">Delivery:</strong> Standard shipping arrives in {shipping.daysMin}–{shipping.daysMax} business days.</p>
                      <p><strong className="text-text-primary">Returns:</strong> Free returns within 30 days of delivery through your Storegrill account.</p>
                      <p><strong className="text-text-primary">Shipping origin:</strong> Regional warehouse network — no surprise customs fees.</p>
                    </div>
                  ),
                },
                {
                  id: 'reviews',
                  label: translatedTabs[3],
                  content: (
                    <div id="reviews-tab">
                      <ReviewSummary average={product.rating} total={product.reviewCount} />
                      {(product.reviews || []).length > 0 ? (
                        <div className="mt-6 divide-y divide-border">
                          {product.reviews.map((r: Record<string, unknown>) => (
                            <ReviewCard
                              key={String(r.id)}
                              locale={language}
                              review={{
                                id: String(r.id),
                                authorName: String((r.user as Record<string, unknown>)?.name || 'Storegrill Customer'),
                                createdAt: String(r.createdAt),
                                rating: Number(r.rating),
                                title: r.title ? String(r.title) : undefined,
                                body: r.body ? String(r.body) : undefined,
                                verified: Boolean(r.verified),
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-6 text-sm text-text-secondary">No written reviews yet — be the first after purchase.</p>
                      )}
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

function SpecsTable({ product }: { product: Record<string, unknown> }) {
  const rows: Array<[string, string]> = [];
  if (product.brand) rows.push(['Brand', String((product.brand as { name?: string })?.name)]);
  if (product.sku) rows.push(['SKU', String(product.sku)]);
  if (product.weightGrams) rows.push(['Weight', `${product.weightGrams} g`]);
  if (product.dimensions) rows.push(['Dimensions', String(product.dimensions)]);
  for (const attr of (product.attributes as Array<{ name: string; value: string }> | undefined) || []) {
    rows.push([attr.name, attr.value]);
  }

  if (rows.length === 0) return <p className="text-sm text-text-secondary">No specifications listed.</p>;

  return (
    <table className="w-full max-w-2xl text-sm border-collapse">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-border last:border-b-0 hover:bg-surface-sunken transition-colors">
            <th scope="row" className="text-left font-bold py-3 pr-8 w-48 text-text-primary align-top">{label}</th>
            <td className="py-3 text-text-secondary">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
