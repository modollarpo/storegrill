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
    <div className="container-site py-4">
      <Breadcrumb items={[{ name: 'Vendors', path: '' }]} regionKey={regionKey} />
      <header className="max-w-prose mb-8">
        <h1 className="text-displaymd font-semibold text-charcoal">Verified Vendors</h1>
        <p className="text-sm text-smoke-600 mt-2">
          Every Storegrill vendor passes identity and quality verification. Ratings reflect real, purchase-verified reviews.
        </p>
      </header>

      {vendors.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-smoke-500">No active vendors in this region yet.</p>
          <a href="/regions" className="text-xs text-tealink hover:text-tealink-hover underline mt-2 inline-block">Browse other regions →</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
