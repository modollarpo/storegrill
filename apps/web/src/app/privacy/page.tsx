import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, lawFor } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Privacy & Cookies Policy — Storegrill ${cfg.name}`,
    description: `How Storegrill ${cfg.name} collects, uses and protects your personal data under the ${lawFor(regionKey).act}.`,
    path: '/privacy',
    regionKey,
  });
}

export default async function PrivacyPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const law = lawFor(regionKey);

  return (
    <div className="container-site py-10 max-w-3xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Privacy &amp; cookies</h1>
      <p className="mt-2 text-xs text-smoke-500">Last updated: 23 August 2026 · Applies to {law.jurisdictionNote}</p>

      <div className="mt-8 space-y-8 text-sm text-smoke-700 leading-relaxed">
        <section aria-labelledby="who">
          <h2 id="who" className="text-displaysm font-semibold text-charcoal mb-3">Who we are</h2>
          <p>
            Storegrill operates this storefront on dedicated in-country infrastructure for{' '}
            <strong>{cfg.name}</strong>. We are the data controller for personal data processed here. You can reach
            our privacy team at <span className="font-mono">{regionKey.toLowerCase()}.privacy@storegrill.net</span>.
          </p>
        </section>

        <section aria-labelledby="collect">
          <h2 id="collect" className="text-displaysm font-semibold text-charcoal mb-3">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account data</strong> — name, email, phone number, delivery addresses.</li>
            <li><strong>Order data</strong> — what you bought, where it shipped, invoices and returns.</li>
            <li><strong>Payment references</strong> — tokenised identifiers only; full card numbers never touch our servers.</li>
            <li><strong>Usage data</strong> — pages viewed and search terms, used to improve ranking and availability.</li>
            <li><strong>Technical data</strong> — IP address (truncated after fraud checks) and device type for security and load balancing.</li>
          </ul>
        </section>

        <section aria-labelledby="why">
          <h2 id="why" className="text-displaysm font-semibold text-charcoal mb-3">Why we use it</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To fulfil your orders, process payments and handle returns — performance of contract.</li>
            <li>To detect fraud and keep accounts secure — legitimate interests and legal obligation.</li>
            <li>To send order updates by email/SMS — performance of contract.</li>
            <li>Marketing emails only with your consent, withdrawable at any time from any email footer.</li>
          </ul>
        </section>

        <section aria-labelledby="cookies">
          <h2 id="cookies" className="text-displaysm font-semibold text-charcoal mb-3">Cookies we set</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-smoke-50 text-left text-smoke-500 uppercase tracking-wide">
                <tr><th className="px-4 py-2.5">Cookie</th><th className="px-4 py-2.5">Purpose</th><th className="px-4 py-2.5">Type</th></tr>
              </thead>
              <tbody className="divide-y divide-smoke-100">
                <tr><td className="px-4 py-2.5 font-mono">sg_prefs</td><td className="px-4 py-2.5">Remembers your country and language choice</td><td className="px-4 py-2.5">Strictly necessary</td></tr>
                <tr><td className="px-4 py-2.5 font-mono">accessToken</td><td className="px-4 py-2.5">Keeps you signed in securely</td><td className="px-4 py-2.5">Strictly necessary</td></tr>
                <tr><td className="px-4 py-2.5 font-mono">Storegrill-storage</td><td className="px-4 py-2.5">Local copy of your basket so it survives refreshes</td><td className="px-4 py-2.5">Strictly necessary</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">We set no advertising or third-party analytics cookies on this storefront.</p>
        </section>

        <section aria-labelledby="rights" className="card p-6 bg-ember-pale border-ember-light">
          <h2 id="rights" className="text-displaysm font-semibold text-charcoal mb-2">Your rights under the {law.act}</h2>
          <p className="mb-2">You have the right to access, correct, delete, restrict and port your data, and to object to processing. To exercise any right, email us or contact:</p>
          <p>
            <a href={law.authorityUrl} target="_blank" rel="noopener noreferrer" className="text-ember font-semibold hover:underline underline-offset-2">
              {law.authority}
            </a>{' '}
            — the supervisory authority for {cfg.name}.
          </p>
        </section>

        <section aria-labelledby="retention">
          <h2 id="retention" className="text-displaysm font-semibold text-charcoal mb-3">How long we keep it</h2>
          <p>
            Order records are kept for as long as tax and consumer law in {cfg.name} requires (typically 6–7 years);
            marketing consent records until you unsubscribe; security logs for 90 days.
          </p>
        </section>

        <p className="text-xs text-smoke-500">
          See also our <Link href="/terms" className="text-ember hover:underline underline-offset-2">Terms &amp; conditions</Link> and{' '}
          <Link href="/returns" className="text-ember hover:underline underline-offset-2">Returns policy</Link>.
        </p>
      </div>
    </div>
  );
}
