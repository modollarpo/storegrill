import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { SELLER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Start selling on Storegrill — ${cfg.name}`,
    description: 'Apply, complete identity verification, set up your store profile, and go live across every region.',
    path: '/sell/guides/start-selling',
    regionKey,
  });
}

export default async function StartSellingPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = SELLER_GUIDES.filter(g => g.slug !== 'start-selling').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Seller guide"
      title="Start selling on Storegrill"
      description="Apply, complete identity verification, set up your store profile, and go live across every region."
      backHref="/sell/guides"
      backLabel="All seller guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="The application">
        <p>Begin from the <Link href="/sell" className="text-ember font-semibold hover:text-ember-deep">sell page</Link> or apply directly on the vendor portal. You will need your business name, a registered address, a tax number where applicable, and contact details. Applications are reviewed within a few working days by the {cfg.name} team.</p>
        <GuideSteps
          items={[
            <>Open the seller application form.</>,
            <>Enter business identity, address and tax details.</>,
            <>Submit bank or payout details for your earnings.</>,
            <>Wait for the review email with your decision.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Identity verification">
        <p>New sellers in {cfg.name} confirm their business identity before listing. Depending on your region this means a government-issued ID, a business registration extract, or both. Documents are checked by our onboarding team and the status appears in your vendor dashboard under Settings.</p>
        <GuideCallout title="Keep documents legible">
          Blurry, truncated or expired documents delay approval. Take a flat, well-lit photo of the full page — most applications pass first time when the document matches the registered business name.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="Setting up your store">
        <p>Once verified, set your store name, logo, banner and short description. This is the first thing shoppers see across every region, so keep it clear and factual. Then go live by listing your first product — see the listing and bulk-import guides to build your catalog fast.</p>
      </GuideSection>

      <GuideSection title="Selling everywhere">
        <p>Storegrill operates in several regions. Your store is available across them by default; each product has <em>per-region</em> price, stock and shipping configuration, so you can tune what you sell where. If something does not look right, email <span className="font-mono bg-black/5 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span>.</p>
      </GuideSection>
    </GuideLayout>
  );
}