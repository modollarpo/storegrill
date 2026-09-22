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
    title: `Returns & refunds — ${cfg.name}`,
    description: 'Start a return within 30 days, arrange free collection for faults, and understand refund timelines.',
    path: '/help/guides/returns-refunds',
    regionKey,
  });
}

export default async function ReturnsRefundsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'returns-refunds').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="Returns & refunds"
      description="Start a return within 30 days, arrange free collection for faults, and understand refund timelines."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title="The 30-day window">
        <p>Most items can be returned within 30 days of delivery in {cfg.name}. Conditions differ by category — the <Link href="/returns" className="text-ember font-semibold hover:text-ember-deep">returns & refunds</Link> page lists every exception, including hygiene-sealed and made-to-order items that can only be returned when faulty.</p>
        <GuideSteps
          items={[
            <><Link href="/account/orders" className="text-ember font-semibold hover:text-ember-deep">Open My Orders</Link> and select the item.</>,
            <>Choose a reason and a return method — collect from you or drop-off.</>,
            <>Print the return label and ship within the stated deadline.</>,
          ]}
        />
      </GuideSection>

      <GuideSection title="Faulty or damaged items">
        <p>If an item arrives damaged, is missing parts, or stops working in normal use, the return is free. Select the fault option when starting the return and add a photo of the damage; our {cfg.name} team arranges collection at no cost to you.</p>
        <GuideCallout title="Keep the packaging">
          Keeping the original box and inserts speeds up fault assessment and prevents delays while a replacement or refund is arranged. If the packaging was already thrown away, tell the agent and we will still help.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="Refund timeline">
        <ul className="space-y-3">
          <li><strong>Card payments</strong> — refunded 3–7 working days after the return is received and inspected.</li>
          <li><strong>Cash on delivery</strong> — COD refunds are made to your account wallet and typically appear within 5 working days of inspection.</li>
          <li><strong>Fault replacements</strong> — dispatched once inspection confirms the fault, usually within 2 working days.</li>
        </ul>
        <p>Email <span className="font-mono bg-black/5 py-0.5 px-1.5 rounded">{supportEmailFor(regionKey)}</span> if a refund is due and has not appeared after the times above.</p>
      </GuideSection>
    </GuideLayout>
  );
}