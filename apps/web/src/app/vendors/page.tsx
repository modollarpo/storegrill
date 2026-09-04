import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { VendorCard } from '@/components/vendor/VendorCard';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Our Vendors & Sellers',
    description: 'Discover verified Storegrill vendors, their storefronts, ratings and policies. Shop confidently from vetted sellers worldwide.',
    path: '/vendors',
    regionKey,
  });
}

async function fetchVendors() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/vendors?status=ACTIVE&limit=24`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { vendors: [] };
  }
}

export default async function VendorsPage() {
  const { regionKey } = await getRequestContext();
  const data = await fetchVendors();
  const vendors = Array.isArray(data.vendors) ? data.vendors : [];

  return (
    <div className="container-site py-8">
      <Breadcrumb items={[{ name: 'Vendors', path: '' }]} regionKey={regionKey} />
      
      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        {/* Sidebar filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          <div className="p-5 bg-surface-raised border border-border rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-charcoal mb-4 uppercase tracking-wider">Categories</h3>
            <ul className="space-y-3 text-sm text-smoke-600">
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="checkbox" className="rounded-xs border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> Electronics</label></li>
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="checkbox" className="rounded-xs border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> Fashion</label></li>
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="checkbox" className="rounded-xs border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> Home & Garden</label></li>
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="checkbox" className="rounded-xs border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> Sports</label></li>
            </ul>
          </div>
          <div className="p-5 bg-surface-raised border border-border rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-charcoal mb-4 uppercase tracking-wider">Rating</h3>
            <ul className="space-y-3 text-sm text-smoke-600">
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="radio" name="rating" className="border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> 4 Stars & Up</label></li>
              <li><label className="flex items-center gap-3 hover:text-ember cursor-pointer transition-colors"><input type="radio" name="rating" className="border-smoke-300 text-ember focus:ring-ember w-4 h-4" /> 3 Stars & Up</label></li>
            </ul>
          </div>
        </aside>

        <div className="flex-1">
          <header className="mb-8 p-8 bg-surface-raised border border-border shadow-sm rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-ember/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <h1 className="text-displaymd font-bold text-charcoal mb-3">Verified Vendors</h1>
            <p className="text-bodyMd text-smoke-600 max-w-2xl leading-relaxed">
              Every Storegrill vendor passes rigorous identity and quality verification. Ratings reflect real, purchase-verified reviews to help you shop confidently.
            </p>
          </header>

          {vendors.length === 0 ? (
            <div className="card p-12 text-center border border-border bg-surface-raised rounded-2xl shadow-sm">
              <p className="text-bodyMd text-smoke-500">No active vendors in this region yet.</p>
              <a href="/regions" className="text-sm text-tealink hover:text-tealink-hover underline mt-4 inline-block transition-colors font-medium">Browse other regions →</a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {vendors.map((v: Record<string, unknown>) => (
                <VendorCard
                  key={String(v.id)}
                  vendor={{
                    id: String(v.id),
                    storeName: String(v.storeName),
                    slug: String(v.slug),
                    logo: v.logo ? String(v.logo) : undefined,
                    description: v.description ? String(v.description) : undefined,
                    rating: Number(v.rating || 0),
                    reviewCount: Number(v.reviewCount || 0),
                  }}
                  className="h-full border border-border shadow-sm hover:shadow-card hover:border-ember transition-all duration-normal"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
