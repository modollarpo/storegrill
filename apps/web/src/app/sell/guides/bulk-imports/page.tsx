import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { SELLER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Bulk product imports — ${cfg.name}`,
    description: 'Upload a CSV, import from a URL feed or FTP/SFTP folder, and review staged changes before they go live.',
    path: '/sell/guides/bulk-imports',
    regionKey,
  });
}

export default async function BulkImportsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = SELLER_GUIDES.filter(g => g.slug !== 'bulk-imports').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Seller guide"
      title="Bulk product imports"
      description="Upload a CSV, import from a URL feed or FTP/SFTP folder, and review staged changes before they go live."
      backHref="/sell/guides"
      backLabel="All seller guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="CSV upload">
        <p>The vendor portal accepts CSV files using the field mapping shown on the import page. Columns map to SKU, title, description, category, price per region and stock per region. The system matches rows to existing products by SKU and creates new products for SKUs it does not know.</p>
        <GuideSteps
          items={[
            <>Download the template and fill in one row per variant.</>,
            <>Upload the file in Catalog &gt; Bulk imports.</>,
            <>Fix rows flagged by validation and upload again.</>,
            <>Review the staged diff and confirm to publish.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="URL and FTP/SFTP feeds">
        <p>Prefer automation? Point us at a product feed on a public URL or an FTP/SFTP folder and we poll it on a schedule. New SKUs are added, changed prices update, and rows removed from the feed can be marked out of stock. Feed imports go through the same staged review as uploads, so nothing publishes unannounced.</p>
      </GuideSection>

      <GuideSection title="Staged previews">
        <p>Every import produces a staged preview: what will be created, what will be updated, and any rows that failed validation. You confirm before anything touches the live storefront for {cfg.name} or any other region. A good rule is to review prices and stock numbers once per file before approving.</p>
        <GuideCallout title="Keep SKUs stable">
          Imports key on SKU. If you change a SKU between uploads, the system creates a duplicate product instead of updating the existing one. Keep SKUs fixed and edit everything else freely.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="Validation rules">
        <p>Rows fail validation when prices are missing or zero, currency codes are unknown, stock is negative, or a region column has no matching configuration. The error report lists the row number and reason for every failed line so you can fix the file in one pass.</p>
      </GuideSection>
    </GuideLayout>
  );
}