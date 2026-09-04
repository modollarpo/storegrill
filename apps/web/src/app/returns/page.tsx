import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig, supportEmailFor } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Returns & Refunds — Storegrill ${cfg.name}`,
    description: `Return most items bought on Storegrill ${cfg.name} within 30 days. Free returns for faulty goods.`,
    path: '/returns',
    regionKey,
  });
}

export default async function ReturnsPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const cod = cfg.paymentMethods.includes('cod');

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">Returns &amp; Refunds</h1>
          <p className="mt-4 text-smoke-600 text-lg">Hassle-free 30-day returns, so you can shop with confidence.</p>
        </header>

        <section aria-labelledby="window" className="mb-16">
          <h2 id="window" className="text-2xl font-extrabold text-charcoal mb-6">Your right to return</h2>
          <div className="bg-surface border border-border shadow-md rounded-[2rem] p-8 md:p-10 space-y-6 text-smoke-600 leading-relaxed">
            <p className="text-lg">
              You can return most items bought on Storegrill {cfg.name} within <strong className="text-charcoal font-bold">30 days of delivery</strong> for
              a full refund, provided the item is in its original condition and packaging with all accessories.
            </p>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <svg className="w-6 h-6 text-ember shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span><strong className="text-charcoal">Faulty or damaged on arrival?</strong> Return is free — we arrange collection by one of our courier partners and cover the cost.</span>
              </li>
              <li className="flex gap-3">
                <svg className="w-6 h-6 text-ember shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span><strong className="text-charcoal">Changed your mind?</strong> Return is free to any partner pickup point; home collection may carry a fee which we show before you book.</span>
              </li>
              <li className="flex gap-3">
                <svg className="w-6 h-6 text-smoke-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <span><strong className="text-charcoal">Hygiene and personalised products</strong> (earbuds seals, software licences, custom orders) can only be returned if faulty.</span>
              </li>
              {cod && (
                <li className="flex gap-3 mt-2 bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-900">
                  <svg className="w-6 h-6 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span><strong className="font-bold">Cash on Delivery orders</strong> are refunded by bank transfer to the account you nominate — typically within 14 days of the item reaching our warehouse.</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="text-2xl font-extrabold text-charcoal mb-6">How to start a return</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              <>Sign in and open <Link href="/account/orders" className="text-ember font-bold hover:underline transition-colors">your orders</Link>.</>,
              <>Select the item and choose a reason — this tells us whether collection is free.</>,
              <>Pick a collection slot or a courier pickup point.</>,
              <>Pack the item in everything you received (box, cables, inserts) and hand it over.</>,
            ].map((step, i) => (
              <li key={i} className="flex flex-col p-8 bg-surface-raised border border-border shadow-sm hover:shadow-md hover:border-ember transition-all rounded-2xl">
                <span className="w-10 h-10 rounded-full bg-ember text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">{i + 1}</span>
                <span className="text-smoke-600 font-medium leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-16 p-8 border-t border-border text-center max-w-2xl mx-auto">
          <p className="text-smoke-500 leading-relaxed">
            Nothing here limits your statutory consumer rights under the law of {cfg.name}. Questions?{' '}
            <Link href="/contact" className="text-charcoal font-bold hover:text-ember transition-colors">Contact us</Link>{' '}
            or email <span className="font-mono bg-surface border border-border py-1 px-2 rounded-md font-semibold text-charcoal">{supportEmailFor(regionKey)}</span>.
          </p>
        </footer>
      </div>
    </div>
  );
}
