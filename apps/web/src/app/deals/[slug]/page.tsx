import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';

async function getDeal(slug: string, regionKey: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${slug}?regionKey=${regionKey}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { regionKey } = await getRequestContext();
  const data = await getDeal(slug, regionKey);
  const deal = data?.deal;
  if (!deal) return buildMetadata({ title: 'Deal Not Found', description: 'This deal is unavailable.', path: `/deals/${slug}`, regionKey, noIndex: true });

  return buildMetadata({
    title: `${deal.name} | Storegrill Deals`,
    description: deal.description?.slice(0, 160) || `${deal.name} — Shop this deal at Storegrill.`,
    path: `/deals/${slug}`,
    regionKey,
  });
}

export default async function DealDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { regionKey, language } = await getRequestContext();
  const data = await getDeal(slug, regionKey);
  const deal = data?.deal;

  if (!deal) notFound();

  const isExpired = deal.endsAt && new Date(deal.endsAt) < new Date();
  const isPercentage = deal.type === 'PERCENTAGE_OFF';
  const valueDisplay = isPercentage
    ? `${deal.value}% OFF`
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currencyCode || 'USD' }).format(deal.value / 100) + ' OFF';

  return (
    <div className="container-site py-6">
      <Breadcrumb
        items={[
          { name: "Today's Deals", path: '/deals' },
          { name: deal.name?.slice(0, 40) ?? 'Deal', path: '' },
        ]}
        regionKey={regionKey}
      />

      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Deal header band */}
          <div className="relative h-56 bg-text-primary overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-14">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="danger" size="md">{deal.type.replace(/_/g, ' ')}</Badge>
                {isExpired && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-white/20 text-white border border-white/30">
                    Expired
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight max-w-xl">
                {deal.name}
              </h1>
              <p className="mt-3 text-5xl font-black text-ember-pale drop-shadow-sm">
                {valueDisplay}
              </p>
            </div>
          </div>

          {/* Deal body */}
          <div className="p-8 space-y-8">
            {deal.description && (
              <p className="text-base text-text-secondary leading-relaxed max-w-2xl">{deal.description}</p>
            )}

            {/* Expiry info */}
            {deal.endsAt && (
              <div className="flex items-center gap-4 bg-surface-sunken border border-border rounded-xl p-5">
                <svg className="w-8 h-8 text-action-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Deal ends</p>
                  <p className="text-base font-extrabold text-text-primary mt-0.5">
                    {new Date(deal.endsAt).toLocaleDateString(language === 'en' ? 'en-GB' : language, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                {isExpired && (
                  <span className="ml-auto text-sm font-extrabold text-feedback-danger">This deal has ended</span>
                )}
              </div>
            )}

            {/* Coupon codes */}
            {deal.coupons?.length > 0 && (
              <section aria-labelledby="coupons-heading">
                <h2 id="coupons-heading" className="text-base font-extrabold text-text-primary mb-4">Coupon Codes</h2>
                <div className="space-y-3">
                  {deal.coupons.map((coupon: any) => (
                    <div key={coupon.id} className="flex items-center gap-4 bg-surface-sunken border border-border rounded-xl p-4">
                      <code className="font-mono font-extrabold text-action-primary bg-surface px-4 py-2 rounded-lg border border-border text-sm shadow-sm tracking-widest">
                        {coupon.code}
                      </code>
                      {coupon.usageLimit && (
                        <span className="text-sm font-medium text-text-secondary">
                          {coupon.usageLimit - (coupon.usageCount || 0)} uses remaining
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Included products */}
            {deal.variants?.length > 0 && (
              <section aria-labelledby="products-heading">
                <h2 id="products-heading" className="text-base font-extrabold text-text-primary mb-5">Included Products</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {deal.variants.map((variant: any) => (
                    <Link
                      key={variant.id}
                      href={`/products/${variant.productId}`}
                      className="group bg-surface border border-border rounded-xl p-4 hover:border-action-primary hover:shadow-sm transition-all"
                    >
                      <div className="aspect-square bg-surface-sunken rounded-lg mb-3 overflow-hidden">
                        {variant.product?.thumbnail ? (
                          <Image
                            src={variant.product.thumbnail}
                            alt={variant.product.name ?? ''}
                            width={200}
                            height={200}
                            className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">No image</div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-action-primary transition-colors">
                        {variant.product?.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Vendor */}
            {deal.vendor && (
              <div className="border-t border-border pt-6 flex items-center gap-4">
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Offered by</p>
                  <Link
                    href={`/vendors/${deal.vendor.slug}`}
                    className="mt-1 text-base font-extrabold text-action-primary hover:underline underline-offset-4"
                  >
                    {deal.vendor.storeName}
                  </Link>
                </div>
              </div>
            )}

            {/* Shop CTA */}
            {!isExpired && (
              <div className="border-t border-border pt-6">
                <Link
                  href={`/products${deal.slug ? `?deal=${deal.slug}` : ''}`}
                  className="inline-flex items-center gap-2 h-13 py-3.5 px-10 rounded-pill bg-action-primary text-action-primary-fg font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
                >
                  Shop this deal
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
