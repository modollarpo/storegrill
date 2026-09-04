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
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center border-b border-border pb-10">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight mb-4">Privacy &amp; cookies</h1>
          <p className="text-smoke-500 font-mono text-sm bg-surface-raised border border-border inline-flex px-3 py-1 rounded-full">
            Last updated: 23 August 2026 · Applies to {law.jurisdictionNote}
          </p>
        </header>

        <div className="space-y-12 text-lg text-smoke-600 leading-relaxed">
          <section aria-labelledby="who">
            <h2 id="who" className="text-2xl font-bold text-charcoal mb-4">Who we are</h2>
            <p>
              Storegrill operates this storefront on dedicated in-country infrastructure for{' '}
              <strong className="text-charcoal">{cfg.name}</strong>. We are the data controller for personal data processed here. You can reach
              our privacy team at <span className="font-mono bg-surface-raised border border-border py-1 px-2 rounded-md font-semibold text-charcoal">{regionKey.toLowerCase()}.privacy@storegrill.net</span>.
            </p>
          </section>

          <section aria-labelledby="collect">
            <h2 id="collect" className="text-2xl font-bold text-charcoal mb-4">What we collect</h2>
            <ul className="list-disc pl-5 space-y-3 marker:text-smoke-300">
              <li><strong className="text-charcoal">Account data</strong> — name, email, phone number, delivery addresses.</li>
              <li><strong className="text-charcoal">Order data</strong> — what you bought, where it shipped, invoices and returns.</li>
              <li><strong className="text-charcoal">Payment references</strong> — tokenised identifiers only; full card numbers never touch our servers.</li>
              <li><strong className="text-charcoal">Usage data</strong> — pages viewed and search terms, used to improve ranking and availability.</li>
              <li><strong className="text-charcoal">Technical data</strong> — IP address (truncated after fraud checks) and device type for security and load balancing.</li>
            </ul>
          </section>

          <section aria-labelledby="why">
            <h2 id="why" className="text-2xl font-bold text-charcoal mb-4">Why we use it</h2>
            <ul className="list-disc pl-5 space-y-3 marker:text-smoke-300">
              <li>To fulfil your orders, process payments and handle returns — performance of contract.</li>
              <li>To detect fraud and keep accounts secure — legitimate interests and legal obligation.</li>
              <li>To send order updates by email/SMS — performance of contract.</li>
              <li>Marketing emails only with your consent, withdrawable at any time from any email footer.</li>
            </ul>
          </section>

          <section aria-labelledby="cookies">
            <h2 id="cookies" className="text-2xl font-bold text-charcoal mb-6">Cookies we set</h2>
            <div className="bg-surface border border-border shadow-sm rounded-2xl overflow-hidden mb-4">
              <table className="w-full text-base">
                <thead className="bg-surface-raised text-left text-charcoal uppercase tracking-wide border-b border-border">
                  <tr><th className="px-6 py-4 font-bold">Cookie</th><th className="px-6 py-4 font-bold">Purpose</th><th className="px-6 py-4 font-bold">Type</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-surface-raised transition-colors"><td className="px-6 py-4 font-mono font-semibold text-charcoal">sg_prefs</td><td className="px-6 py-4">Remembers your country and language choice</td><td className="px-6 py-4 text-smoke-500">Strictly necessary</td></tr>
                  <tr className="hover:bg-surface-raised transition-colors"><td className="px-6 py-4 font-mono font-semibold text-charcoal">accessToken</td><td className="px-6 py-4">Keeps you signed in securely</td><td className="px-6 py-4 text-smoke-500">Strictly necessary</td></tr>
                  <tr className="hover:bg-surface-raised transition-colors"><td className="px-6 py-4 font-mono font-semibold text-charcoal">Storegrill-storage</td><td className="px-6 py-4">Local copy of your basket so it survives refreshes</td><td className="px-6 py-4 text-smoke-500">Strictly necessary</td></tr>
                </tbody>
              </table>
            </div>
            <p>We set no advertising or third-party analytics cookies on this storefront.</p>
          </section>

          <section aria-labelledby="rights" className="bg-ember/5 border border-ember/20 rounded-[2rem] p-8 shadow-sm">
            <h2 id="rights" className="text-2xl font-bold text-charcoal mb-4">Your rights under the {law.act}</h2>
            <p className="mb-4">You have the right to access, correct, delete, restrict and port your data, and to object to processing. To exercise any right, email us or contact:</p>
            <p>
              <a href={law.authorityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ember font-bold hover:underline underline-offset-4 transition-all">
                {law.authority} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>{' '}
              — the supervisory authority for {cfg.name}.
            </p>
          </section>

          <section aria-labelledby="retention">
            <h2 id="retention" className="text-2xl font-bold text-charcoal mb-4">How long we keep it</h2>
            <p>
              Order records are kept for as long as tax and consumer law in {cfg.name} requires (typically 6–7 years);
              marketing consent records until you unsubscribe; security logs for 90 days.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border text-center text-smoke-500">
          <p>
            See also our <Link href="/terms" className="text-charcoal font-bold hover:text-ember transition-colors">Terms &amp; conditions</Link> and{' '}
            <Link href="/returns" className="text-charcoal font-bold hover:text-ember transition-colors">Returns policy</Link>.
          </p>
        </footer>
      </div>
    </div>
  );
}
