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
    title: `Fulfillment & payouts — ${cfg.name}`,
    description: 'Ship orders, add tracking numbers, and follow your payout ledger from pending to paid.',
    path: '/sell/guides/fulfillment-payouts',
    regionKey,
  });
}

export default async function FulfillmentPayoutsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = SELLER_GUIDES.filter(g => g.slug !== 'fulfillment-payouts').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Seller guide"
      title="Fulfillment & payouts"
      description="Ship orders, add tracking numbers, and follow your payout ledger from pending to paid."
      backHref="/sell/guides"
      backLabel="All seller guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="Fulfilling orders">
        <p>New orders appear in your vendor dashboard with the items, the {cfg.name} or other regional delivery address, and the promised shipping window. Ship within that window — sellers who ship late see their standing affected.</p>
        <GuideSteps
          items={[
            <>Open Orders and filter for Awaiting shipment.</>,
            <>Pick or pack the items for each order line.</>,
            <>Add the carrier and the tracking number against the order.</>,
            <>Marked shipped, the customer sees your tracking on their order page.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Shipping labels & carriers">
        <p>Regional courier partners appear when you choose a shipping method at checkout. Where a pre-negotiated label is available, generate it in the portal; otherwise enter your own carrier and tracking number. Scanning numbers early means fewer customer queries about parcel location.</p>
        <GuideCallout title="Out of stock?">
          If you cannot fulfill an order, contact us before the shipping window passes. In most cases we arrange a replacement or a refund for the shopper so you do not get a late-shipment strike.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="How payouts work">
        <p>Your payout ledger records every order: the sale value, the commission taken, adjustments and the net payable. Payments release on the schedule shown in your portal (usually a periodic batch after the return window). The ledger shows each payout from pending to paid with the settlement date of each order.</p>
      </GuideSection>

      <GuideSection title="Reading your ledger">
        <ul className="space-y-3">
          <li><strong>Pending</strong> — the order cleared but has not reached the payout batch yet.</li>
          <li><strong>Processing</strong> — included in the current batch being settled.</li>
          <li><strong>Paid</strong> — money transferred to your bank or wallet on the stated date.</li>
          <li><strong>Negatives</strong> — refunds, chargebacks or adjustments shown as negative lines.</li>
        </ul>
        <p>Reconciling the ledger monthly is quick: add your Paid lines and confirm they match your bank statements. Discrepancies go to portal support with your payout ID.</p>
      </GuideSection>
    </GuideLayout>
  );
}