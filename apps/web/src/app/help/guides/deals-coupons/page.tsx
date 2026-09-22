import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { CUSTOMER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Deals & coupons — ${cfg.name}`,
    description: 'Find flash sales, apply coupon codes at checkout, and understand deal limits and stock caps.',
    path: '/help/guides/deals-coupons',
    regionKey,
  });
}

export default async function DealsCouponsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'deals-coupons').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="Deals & coupons"
      description="Find flash sales, apply coupon codes at checkout, and understand deal limits and stock caps."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Where deals live">
        <p>The <Link href="/deals" className="text-ember font-semibold hover:text-ember-deep">deals</Link> page lists offers live in {cfg.name} right now. Deals are regional — the same promotion may not be active in every country, and prices are always shown in {cfg.defaultCurrency}.</p>
        <GuideSteps
          items={[
            <>Open the deals page to see today&apos;s promotions and their remaining stock.</>,
            <>Tap a deal to open the product at its discounted price.</>,
            <>Add to cart before stock runs out — deal availability is limited and first-day quantities sell fast.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Applying coupon codes">
        <p>Coupon codes you receive by email or on the site work at a single checkout. Enter the code in the coupon field, press apply, and the discount appears on the order summary before you confirm.</p>
        <GuideSteps
          items={[
            <>Copy the code exactly, including any prefix such as SG-SAVE10.</>,
            <>Paste it into the coupon field on the checkout review step.</>,
            <>Confirm the discount line appears before paying — a code that does not validate is ignored, not held over.</>,
          ]}
        />
        <p>Coupons cannot be combined with each other on the same order. One code per checkout, and typically one use per customer account. If a code shows as invalid, it has expired, been spent, or is unavailable in your region.</p>
      </GuideSection>

      <GuideSection title="Deal limits & fine print">
        <p>Every deal states its stock cap and any per-customer limit on the product page. If a deal item is already in your cart when the sale ends, it converts back to its standard price at checkout. Washed-out prices, quantity rules and excluded categories are listed in the deal terms on the deals page.</p>
      </GuideSection>
    </GuideLayout>
  );
}