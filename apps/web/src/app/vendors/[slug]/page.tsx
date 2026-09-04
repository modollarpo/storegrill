import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { buildMetadata, organizationJsonLd } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { ProductCard } from '@/components/commerce/ProductCard';

export const revalidate = 120;

interface VendorPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchVendor(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/vendors/slug/${slug}`, { next: { revalidate: 120 } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { regionKey } = await getRequestContext();
  const data = await fetchVendor(slug);
  if (!data?.vendor) {
    return buildMetadata({ title: 'Vendor not found', description: 'This vendor storefront is unavailable.', path: `/vendors/${slug}`, regionKey, noIndex: true });
  }
  return buildMetadata({
    title: `${data.vendor.storeName} — Official Store`,
    description:
      data.vendor.description ||
      `Shop products from ${data.vendor.storeName} on Storegrill. Verified seller with purchase-verified reviews.`,
    path: `/vendors/${slug}`,
    regionKey,
  });
}

export default async function VendorStorefront({ params }: VendorPageProps) {
  const { slug } = await params;
  const { regionKey, language } = await getRequestContext();
  const data = await fetchVendor(slug);
  if (!data?.vendor) notFound();

  const vendor = data.vendor;
  let products = Array.isArray(data.products) ? data.products : [];
  products = await localizeProducts(products.slice(0, 24), language);

  return (
    <div className="container-site py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <Breadcrumb items={[{ name: 'Vendors', path: '/vendors' }, { name: String(vendor.storeName), path: '' }]} regionKey={regionKey} />

      <section className="relative overflow-hidden rounded-2xl bg-text-primary p-8 md:p-12 mb-10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent" />
        <span aria-hidden="true" className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-action-primary/30 blur-3xl mix-blend-screen" />
        
        <div className="relative z-10">
          <p className="text-action-primary font-bold text-xs uppercase tracking-[0.2em] mb-2">Official Storegrill Seller</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white flex items-center gap-3 flex-wrap drop-shadow-sm">
            {vendor.storeName}
            <svg className="w-7 h-7 text-action-primary drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Verified seller">
              <path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 19.5 12 21 14.4l-2.7 2.3-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 4.5 12 3 9.6l2.7-2.3.5-3.4 3.4.5L12 2zm-1 13.4l5-5-1.4-1.4-3.6 3.58-1.6-1.6L8 12.6l3 2.8z"/>
            </svg>
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/80">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-feedback-warning" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {Number(vendor.rating || 0).toFixed(1)} ({Number(vendor.reviewCount || 0).toLocaleString()} reviews)
            </span>
            {products.length > 0 && <span className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> {products.length.toLocaleString()} products</span>}
            {(vendor.kycStatus === 'ACTIVE' || vendor.status === 'ACTIVE') && <span className="flex items-center gap-1.5 text-feedback-success"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> KYC verified</span>}
          </div>
          {vendor.description && (
            <p className="mt-5 max-w-prose text-sm text-white/70 leading-relaxed font-medium">{vendor.description}</p>
          )}
        </div>
      </section>

      <h2 className="text-2xl font-extrabold text-text-primary mb-6">Products</h2>
      {products.length === 0 ? (
        <div className="bg-surface-sunken border border-border rounded-xl p-16 text-center shadow-sm">
          <svg className="w-12 h-12 text-text-tertiary mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <p className="text-base font-bold text-text-primary">This vendor has no live listings in your region yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {products.map((p: Record<string, unknown>) => (
            <ProductCard key={String(p.id)} product={p as never} locale={language} />
          ))}
        </div>
      )}

      <section className="mt-12 grid md:grid-cols-3 gap-5 max-w-5xl" aria-label="Vendor policies">
        {[
          ['Shipping policy', vendor.shippingPolicy || 'Ships within 2 business days via regional carriers.', 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12'],
          ['Return policy', vendor.returnPolicy || '30-day returns, free pickup on eligible items.', 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'],
          ['Support', vendor.supportEmail ? `Contact: ${vendor.supportEmail}` : 'Message the store from any product page.', 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 12.677a2.25 2.25 0 00-.1.661z'],
        ].map(([title, body, icon]) => (
          <div key={title} className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:border-action-primary transition-colors group">
            <div className="w-10 h-10 rounded-full bg-action-primary/10 flex items-center justify-center mb-4 group-hover:bg-action-primary/20 transition-colors">
              <svg className="w-5 h-5 text-action-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-2">{title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
