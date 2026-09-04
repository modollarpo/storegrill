import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { regionConfig } from '@/lib/region-content';
import { TrackForm } from './TrackForm';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  return buildMetadata({
    title: `Track Your Order — Storegrill ${cfg.name}`,
    description: `Track a Storegrill ${cfg.name} order with your SG- order number.`,
    path: '/track',
    regionKey,
  });
}

export default async function TrackPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const zone = cfg.shippingZones[0];

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">Where&apos;s my order?</h1>
          <p className="mt-4 text-smoke-600 text-lg">Enter your order number to track its current status.</p>
        </header>
        
        <div className="bg-surface border border-border shadow-lg p-8 md:p-12 mb-16 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ember/5 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3"></div>
          <TrackForm />
        </div>

        <section aria-labelledby="stages">
          <h2 id="stages" className="text-2xl font-extrabold text-charcoal mb-8 text-center">What each status means</h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ['Confirmed', 'Payment verified and the vendor is preparing your item.'],
              ['Dispatched', zone ? `Handed to a courier (${zone.carriers.join(', ')}) — tracking link emailed.` : 'Handed to a courier — tracking link emailed.'],
              ['Out for delivery', `On the vehicle today. Standard windows are ${zone?.estimatedDaysMin ?? 2}–${zone?.estimatedDaysMax ?? 7} working days.`],
              ['Delivered', 'Signed for at your address or collected from a pickup point.'],
            ].map(([title, desc], i) => (
              <li key={title} className="bg-surface-raised border border-border rounded-2xl p-6 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
                <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-ember/10 text-ember font-bold text-sm">
                  {i + 1}
                </span>
                <div>
                  <span className="block text-lg font-bold text-charcoal">{title}</span>
                  <span className="block text-smoke-600 mt-2 leading-relaxed">{desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
