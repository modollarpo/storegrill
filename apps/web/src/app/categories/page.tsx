import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { getCategories } from '@/lib/api-client';

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
  const categories = await getCategories(regionKey);

  return (
    <div className="container-site py-16 md:py-24">
      <Breadcrumb items={[]} regionKey={regionKey} />
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-4">Shop by Category</h1>
        <p className="text-lg text-text-secondary max-w-2xl leading-relaxed">
          Explore our curated categories, featuring verified regional sellers, secure checkout, and reliable delivery across all Storegrill markets.
        </p>
      </header>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map(cat => (
          <li key={cat.slug}>
            <Link
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm transition-all hover:border-action-primary hover:shadow-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-sunken grid place-items-center group-hover:bg-action-primary/10 transition-colors">
                <span className="text-2xl">📦</span>
              </div>
              <span className="text-lg font-bold text-text-primary group-hover:text-action-primary transition-colors">{cat.name}</span>
              {cat.children.length > 0 && (
                <span className="text-xs text-text-secondary line-clamp-2">
                  {cat.children.slice(0, 3).map(c => c.name).join(' · ')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}