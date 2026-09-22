import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { CUSTOMER_GUIDES } from '@/lib/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Track your order — ${cfg.name}`,
    description: 'Follow a parcel from dispatch to doorstep using your order number — no sign-in required.',
    path: '/help/guides/tracking-orders',
    regionKey,
  });
}

export default async function TrackingOrdersPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'tracking-orders').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="Track your order"
      description="Follow a parcel from dispatch to doorstep using your order number — no sign-in required."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Track without an account">
        <p>Your order number (format SG-XXXXXX) is on the confirmation page and in the confirmation email. Enter it on the <Link href="/track" className="text-ember font-semibold hover:text-ember-deep">track an order</Link> page to see the latest status — no sign-in needed.</p>
        <GuideSteps
          items={[
            <>Find your SG-XXXXXX order number in the confirmation email.</>,
            <>Open the track-an-order page in your region and type the number.</>,
            <>Watch for status updates: confirmed, shipped, in transit, out for delivery and delivered.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Order statuses, explained">
        <ul className="space-y-3">
          <li><strong>Confirmed</strong> — payment cleared and the order is with the seller in {cfg.name}.</li>
          <li><strong>Shipped</strong> — a tracking number from our courier partner has been issued.</li>
          <li><strong>In transit</strong> — the parcel is moving through the {cfg.name} delivery network.</li>
          <li><strong>Out for delivery</strong> — the courier expects to deliver today.</li>
          <li><strong>Delivered</strong> — parcel left at your address.</li>
        </ul>
      </GuideSection>

      <GuideSection title="If tracking has not updated">
        <p>Tracking numbers can take up to 24 hours to show movement after dispatch. If a parcel shows no update for more than 48 hours after the estimated window, or you believe it was lost in transit, raise a case through <Link href="/returns" className="text-ember font-semibold hover:text-ember-deep">returns & refunds</Link> and choose the lost-in-transit option.</p>
        <GuideCallout title="Delivery times vary by region">
          Estimated windows on product pages already account for {cfg.name} shipping times. Standard delivery from our regional fulfilment network is typically the fastest option for your area.
        </GuideCallout>
      </GuideSection>
    </GuideLayout>
  );
}