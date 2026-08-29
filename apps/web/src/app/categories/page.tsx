import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { FACET_CATEGORIES } from '@/components/commerce/ProductListing';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Shop by Category',
    description: 'Browse Storegrill by category — electronics, computers, home, fashion, beauty, sports and more from verified regional sellers.',
    path: '/categories',
    regionKey,
  });
}

export default async function CategoriesIndex() {
  const { regionKey } = await getRequestContext();

  return (
    <div className="container-site py-8">
      <Breadcrumb items={[]} regionKey={regionKey} />
      <h1 className="text-heading-xl font-bold text-text-primary mb-2">Shop by Category</h1>
      <p className="text-text-secondary mb-8 max-w-2xl">
        Explore curated categories with regional pricing, verified sellers and secure checkout across all Storegrill markets.
      </p>

      <ul className="grid grid-cols-2 min-md:grid-cols-3 min-lg:grid-cols-4 gap-4">
        {FACET_CATEGORIES.map(cat => (
          <li key={cat.slug}>
            <Link
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface p-8 text-center shadow-sm transition-colors hover:border-action-primary hover:bg-surface-sunken"
            >
              <span className="text-2xl font-bold text-text-primary group-hover:text-action-primary">{cat.name}</span>
              <span className="text-xs font-medium text-text-tertiary">Shop now →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
