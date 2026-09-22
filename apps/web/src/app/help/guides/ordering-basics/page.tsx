import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { CUSTOMER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `How to place an order — ${cfg.name}`,
    description: 'Browse, add to cart, pick your delivery and payment method, and confirm your order in a few taps.',
    path: '/help/guides/ordering-basics',
    regionKey,
  });
}

export default async function OrderingBasicsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'ordering-basics').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="How to place an order"
      description="Browse, add to cart, pick your delivery and payment method, and confirm your order in a few taps."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Find what you need">
        <p>The storefront organizes products by category, brand and region. Use the search bar at the top of any page, or browse collections from the home page. Every product page shows the {cfg.name} price in {cfg.defaultCurrency}, stock status and estimated delivery window before you add it to your cart.</p>
        <GuideSteps
          items={[
            <>Open a product page to review the description, photos and regional delivery estimate.</>,
            <>Choose a quantity and, if quantity rules apply, respect the per-customer limit shown on the page.</>,
            <>Select <strong>Add to cart</strong>. You can keep browsing — the cart keeps your selections.</>,
            <><Link href="/contact" className="text-ember font-semibold hover:text-ember-deep">Contact support</Link> if the item you want is out of stock; our {cfg.name} team may be able to tell you when it restocks.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Checkout, step by step">
        <GuideSteps
          items={[
            <>Open the cart and review quantities, sizes or colours.</>,
            <>Choose a delivery address and confirm the shipping method — standard or express — at the costs shown for {cfg.name}.</>,
            <>Select a payment method. Prefer card? Secure checkout protects your details (see our payments guide).</>,
            <>Review the full order summary, then confirm. You will see a confirmation page with your order number in the SG-XXXXXX format.</>,
          ]}
        />
        <GuideCallout title="Save a copy of the receipt">
          Your invoice is emailed to the address on your account and stays available under My Orders for signed-in shoppers. Keep the order number handy — you will need it to track the parcel.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="If something goes wrong">
        <p>Orders that fail payment are cancelled automatically and nothing is charged. If you receive a confirmation but the charge never appears, the payment was declined and the order may not have gone through — email <span className="font-mono bg-black/5 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span> for help.</p>
      </GuideSection>
    </GuideLayout>
  );
}