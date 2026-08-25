import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { paymentMethodLabel, providerFor } from '@Storegrill/shared';
import { regionConfig } from '@/lib/region-content';


const METHOD_BLURB: Record<string, string> = {
  card: 'Visa, Mastercard and Verve debit or credit cards. Processed with 3-D Secure authentication.',
  paypal: 'Pay with your PayPal balance, linked bank account or card.',
  klarna: 'Split the cost into interest-free instalments at checkout.',
  afterpay: 'Buy now, pay later in four fortnightly payments.',
  sepa_debit: 'Direct debit for customers with a euro bank account.',
  ideal: 'Pay directly from your own bank through iDEAL.',
  bancontact: 'Belgium’s most popular way to pay online.',
  bizum: 'Instant mobile payments linked to your Spanish bank account.',
  mbway: 'Portuguese mobile wallet — pay with your phone number.',
  multibanco: 'Generate a reference and pay via your Portuguese bank.',
  blik: 'Polish mobile payment standard — six-digit code in your banking app.',
  przelewy24: 'Online bank transfer covering all major Polish banks.',
  mobilepay: 'Danish and Finnish mobile wallet.',
  swish: 'Swedish instant mobile payments.',
  twint: 'Swiss mobile payment app.',
  konbini: 'Pay in cash at a Japanese convenience store counter.',
  cod: 'Pay the courier in cash when your order is delivered. Exact change helps.',
};

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Ways to Pay — Storegrill ${cfg.name}`,
    description: `Payment methods accepted on Storegrill ${cfg.name}: ${cfg.paymentMethods.map(m => paymentMethodLabel(m as never)).join(', ')}.`,
    path: '/payments',
    regionKey,
  });
}

export default async function PaymentsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);

  return (
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Ways to pay</h1>
      <p className="mt-3 text-sm text-smoke-600 leading-relaxed">
        These are the payment methods available on <strong>Storegrill {cfg.name}</strong>. Which options appear
        at checkout depends on your country — you will only ever see methods that work locally.
      </p>

      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
        {cfg.paymentMethods.map(method => (
          <li key={method} className="card p-5 flex items-start gap-4">
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-full bg-ember-pale text-ember grid place-items-center text-sm font-bold uppercase">
              {method.slice(0, 2)}
            </span>
            <span>
              <span className="block text-sm font-bold text-charcoal">{paymentMethodLabel(method)}</span>
              <span className="block text-xs text-smoke-600 mt-1 leading-relaxed">{METHOD_BLURB[method]}</span>
              <span className="mt-2 inline-block px-1.5 py-px rounded-xs bg-smoke-100 text-2xs font-bold text-smoke-600 uppercase tracking-wide">
                via {providerFor(method) === 'cod' ? 'courier network' : providerFor(method)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="security" className="mt-8 card p-6 max-w-prose">
        <h2 id="security" className="text-sm font-bold text-charcoal">Payment security</h2>
        <p className="mt-2 text-xs text-smoke-600 leading-relaxed">
          Card details are tokenised by our payment providers — Storegrill never stores your full card number.
          All traffic is encrypted (TLS 1.3). For Cash on Delivery orders the courier issues a printed receipt;
          refunds for COD orders are paid by bank transfer within 14 days.
        </p>
      </section>
    </div>
  );
}
