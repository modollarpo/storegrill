import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { GuideCallout, GuideSection, GuideSteps } from '@/components/guides/GuideSection';
import { CUSTOMER_GUIDES } from '@/lib/guides';

const REGION_METHODS: Record<string, string[]> = {
  US: ['Cards', 'PayPal', 'Apple Pay / Google Pay', 'Store credit'],
  UK: ['Cards (Visa, Mastercard, Amex)', 'PayPal', 'Apple Pay / Google Pay', 'Bank transfer'],
  EU: ['Cards (Visa, Mastercard)', 'SEPA bank transfer', 'PayPal', 'Apple Pay / Google Pay'],
  AE: ['Cards', 'Apple Pay / Google Pay', 'Cash on delivery (COD)'],
  NG: ['Cards', 'Bank transfer (NIP)', 'Cash on delivery (COD)', 'USSD codes'],
};

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Payments & currency — ${cfg.name}`,
    description: 'Every payment method available in your region, how currency conversion works, and how we keep card data safe.',
    path: '/help/guides/payments-currency',
    regionKey,
  });
}

export default async function PaymentsCurrencyPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const methods = REGION_METHODS[regionKey] ?? REGION_METHODS.US;
  const related = CUSTOMER_GUIDES.filter(g => g.slug !== 'payments-currency').slice(0, 4);

  return (
    <GuideLayout
      eyebrow="Customer guide"
      title="Payments & currency"
      description="Every payment method available in your region, how currency conversion works, and how we keep card data safe."
      backHref="/help/guides"
      backLabel="All customer guides"
      related={related.map(g => ({ href: g.path, title: g.title, description: g.description }))}
    >
      <GuideSection title={`Ways to pay in ${cfg.name}`}>
        <ul className="space-y-3">
          {methods.map(m => (
            <li key={m} className="flex items-center gap-3">
              <svg className="w-5 h-5 text-ember shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {m}
            </li>
          ))}
        </ul>
        <p>The <Link href="/payments" className="text-ember font-semibold hover:text-ember-deep">ways to pay</Link> page shows the full breakdown and any region-specific fees or limits.</p>
      </GuideSection>

      <GuideSection title="Currency & conversion">
        <p>All prices on the Storegrill {cfg.name} storefront are shown in {cfg.defaultCurrency}. If your bank card is issued in another currency, your issuer converts the charge at their own rate and may add a small foreign-transaction fee. Your order confirmation and invoice record the exact amount charged at checkout, so the number on your statement should match.</p>
        <GuideCallout title="Choose local payment methods to avoid fees">
          Paying with a {cfg.name} method or card avoids international conversion fees entirely. Where available, COD and local bank transfer carry no currency conversion at all.
        </GuideCallout>
      </GuideSection>

      <GuideSection title="How card data stays safe">
        <p>Card details are collected through a PCI-compliant payment service and are never stored on our servers. We see only the last four digits and the payment brand. Just checking out on the official site (look for the padlock on the address bar) is enough to keep your card safe.</p>
        <GuideSteps
          items={[
            <>Shop only on storegrill domains and check the secure padlock icon.</>,
            <>Never share your one-time codes or card CVV with anyone — our support team never asks for them.</>,
            <>Review charges against your confirmation email; report anything unfamiliar immediately.</>,
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}