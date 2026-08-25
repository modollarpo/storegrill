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
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Where&apos;s my order?</h1>
      <div className="mt-6">
        <TrackForm />
      </div>

      <section aria-labelledby="stages" className="mt-8 max-w-xl">
        <h2 id="stages" className="text-displaysm font-semibold text-charcoal mb-3">What each status means</h2>
        <ol className="space-y-3 text-sm">
          {[
            ['Confirmed', 'Payment verified and the vendor is preparing your item.'],
            ['Dispatched', zone ? `Handed to a courier (${zone.carriers.join(', ')}) — tracking link emailed.` : 'Handed to a courier — tracking link emailed.'],
            ['Out for delivery', `On the vehicle today. Standard windows are ${zone?.estimatedDaysMin ?? 2}–${zone?.estimatedDaysMax ?? 7} working days.`],
            ['Delivered', 'Signed for at your address or collected from a pickup point.'],
          ].map(([title, desc]) => (
            <li key={title} className="card p-4 flex gap-3 items-start">
              <span aria-hidden="true" className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-ember" />
              <span>
                <span className="block text-sm font-bold text-charcoal">{title}</span>
                <span className="block text-xs text-smoke-600 mt-0.5 leading-relaxed">{desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
