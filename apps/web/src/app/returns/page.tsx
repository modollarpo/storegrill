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
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Returns &amp; refunds</h1>

      <section aria-labelledby="window" className="mt-8">
        <h2 id="window" className="text-displaysm font-semibold text-charcoal mb-3">Your right to return</h2>
        <div className="card p-6 space-y-4 text-sm text-smoke-700 leading-relaxed">
          <p>
            You can return most items bought on Storegrill {cfg.name} within <strong>30 days of delivery</strong> for
            a full refund, provided the item is in its original condition and packaging with all accessories.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Faulty or damaged on arrival?</strong> Return is free — we arrange collection by one of our courier partners and cover the cost.</li>
            <li><strong>Changed your mind?</strong> Return is free to any partner pickup point; home collection may carry a fee which we show before you book.</li>
            <li><strong>Hygiene and personalised products</strong> (earbuds seals, software licences, custom orders) can only be returned if faulty.</li>
            {cod && (
              <li><strong>Cash on Delivery orders</strong> are refunded by bank transfer to the account you nominate — typically within 14 days of the item reaching our warehouse.</li>
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how" className="mt-8">
        <h2 id="how" className="text-displaysm font-semibold text-charcoal mb-3">How to start a return</h2>
        <ol className="space-y-3 text-sm text-smoke-700">
          {[
            <>Sign in and open <Link href="/account/orders" className="text-ember font-semibold hover:underline underline-offset-2">your orders</Link>.</>,
            <>Select the item and choose a reason — this tells us whether collection is free.</>,
            <>Pick a collection slot or a courier pickup point.</>,
            <>Pack the item in everything you received (box, cables, inserts) and hand it over.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="shrink-0 w-7 h-7 rounded-full bg-ember text-white grid place-items-center text-xs font-bold">{i + 1}</span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 card p-6 max-w-prose">
        <p className="text-xs text-smoke-600 leading-relaxed">
          Nothing here limits your statutory consumer rights under the law of {cfg.name}. Questions?{' '}
          <Link href="/contact" className="text-ember font-semibold hover:underline underline-offset-2">Contact us</Link>{' '}
          or email <span className="font-mono">{supportEmailFor(regionKey)}</span>.
        </p>
      </footer>
    </div>
  );
}
