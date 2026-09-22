import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { SELLER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `List your products — ${cfg.name}`,
    description: 'Add products and variants by hand, set per-region prices and stock, and keep listings in good standing.',
    path: '/sell/guides/product-listings',
    regionKey,
  });
}

export default async function ProductListingsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = SELLER_GUIDES.filter(g => g.slug !== 'product-listings').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Seller guide"
      title="List your products"
      description="Add products and variants by hand, set per-region prices and stock, and keep listings in good standing."
      backHref="/sell/guides"
      backLabel="All seller guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Creating a product">
        <p>In the vendor portal, go to Catalog and choose Add product. Titles, description and photos are shared across regions; price and stock are set separately per region because demand and costs differ in {cfg.name} and elsewhere.</p>
        <GuideSteps
          items={[
            <>Add a clear title, description and at least one photo.</>,
            <>Define variants — size, colour or model — each with its own SKU.</>,
            <>Set {cfg.defaultCurrency} price and stock per region.</>,
            <>Save and publish when the preview looks right.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Per-region pricing">
        <p>Every product carries a price in each region you choose to sell in. Prices are stored as exact minor units with a currency code — never floating-point rounding. When a shopper in {cfg.name} or another region views your product, they see the price configured for their region and currency.</p>
      </GuideSection>

      <GuideSection title="Growing the catalog">
        <p>For tens or hundreds of items, manual entry is slow. The bulk-import guide covers CSV upload, URL feeds and FTP/SFTP syncs. A staged preview lets you review every change before it goes live, so mistakes never touch the storefront.</p>
      </GuideSection>

      <GuideSection title="Keeping listings in good standing">
        <p>Listings that ship late, go out of stock without notice, or carry misleading photos can be unpublished by our moderation team. Keep stock honest, ship within the promised window and update listings promptly when a product is discontinued. Details are in your seller terms.</p>
      </GuideSection>
    </GuideLayout>
  );
}