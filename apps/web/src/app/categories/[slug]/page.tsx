import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductListing, buildListingMetadata } from '@/components/commerce/ProductListing';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  electronics: 'Discover the latest gadgets, audio gear and smart devices from verified sellers with regional pricing and warranty support.',
  computers: 'Laptops, desktops, components and accessories — compare specs and prices across trusted vendors.',
  home: 'Upgrade your space with kitchen, décor and appliance essentials delivered regionally.',
  fashion: 'Apparel, footwear and accessories for every season, sourced from local and global brands.',
  beauty: 'Skincare, makeup and personal care favorites with authentic-product guarantees.',
  sports: 'Gear and apparel for training, outdoors and everyday movement.',
  books: 'Bestsellers, classics and educational titles with fast regional delivery.',
};

const SUBCATEGORIES: Record<string, { name: string; slug: string }[]> = {
  electronics: [
    { name: 'Headphones', slug: 'headphones' },
    { name: 'Speakers', slug: 'speakers' },
    { name: 'Smart Watches', slug: 'smart-watches' },
    { name: 'Cameras', slug: 'cameras' },
    { name: 'Accessories', slug: 'electronics-accessories' },
  ],
  computers: [
    { name: 'Laptops', slug: 'laptops' },
    { name: 'Monitors', slug: 'monitors' },
    { name: 'Keyboards', slug: 'keyboards' },
    { name: 'Storage', slug: 'storage' },
    { name: 'Components', slug: 'components' },
  ],
  home: [
    { name: 'Cookware', slug: 'cookware' },
    { name: 'Small Appliances', slug: 'small-appliances' },
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Bedding', slug: 'bedding' },
  ],
  fashion: [
    { name: 'Shoes', slug: 'shoes' },
    { name: 'Tops', slug: 'tops' },
    { name: 'Outerwear', slug: 'outerwear' },
    { name: 'Bags', slug: 'bags' },
  ],
  beauty: [
    { name: 'Skincare', slug: 'skincare' },
    { name: 'Makeup', slug: 'makeup' },
    { name: 'Haircare', slug: 'haircare' },
  ],
  sports: [
    { name: 'Fitness', slug: 'fitness' },
    { name: 'Outdoor', slug: 'outdoor' },
    { name: 'Cycling', slug: 'cycling' },
  ],
  books: [
    { name: 'Fiction', slug: 'fiction' },
    { name: 'Non-Fiction', slug: 'non-fiction' },
    { name: 'Educational', slug: 'educational' },
  ],
};

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(searchParams, { forceCategory: slug });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const name = prettify(slug);
  const description = CATEGORY_DESCRIPTIONS[slug];
  const sub = SUBCATEGORIES[slug] ?? [];

  const hero = (
    <section className="card border border-border bg-surface p-6 min-md:p-10 mb-6 rounded-xl shadow-sm">
      <h1 className="text-heading-xl font-bold text-text-primary">{name}</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        {description ?? `Browse ${name} on Storegrill with regional pricing, verified sellers and secure checkout.`}
      </p>
      {sub.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {sub.map(s => (
            <Link
              key={s.slug}
              href={`/products?category=${s.slug}`}
              className="px-4 py-1.5 rounded-pill bg-surface-sunken border border-border text-xs font-bold text-text-primary hover:text-action-primary hover:border-action-primary transition-colors"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <ProductListing
      searchParams={searchParams}
      forceCategory={slug}
      basePath={`/categories/${slug}`}
      breadcrumbItems={[{ name: 'Categories', path: '/categories' }, { name, path: '' }]}
      hero={hero}
    />
  );
}
