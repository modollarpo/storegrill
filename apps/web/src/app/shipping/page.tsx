import type { Metadata } from 'next';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { formatMoney, createMoney } from '@Storegrill/shared';
import { regionConfig } from '@/lib/region-content';


export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const currency = cfg.shippingZones[0]?.currencyCode ?? cfg.defaultCurrency;
  const threshold = formatMoney(
    createMoney(BigInt(cfg.freeShippingThresholdMinorUnits), currency),
  );
  return buildMetadata({
    title: `Delivery Options & Shipping Rates — ${cfg.name}`,
    description: `Delivery costs, times and carriers for Storegrill ${cfg.name}. Free delivery on eligible orders over ${threshold}.`,
    path: '/shipping',
    regionKey,
  });
}

export default async function ShippingPage() {
  const { regionKey } = await getRequestContext();
  const cfg = regionConfig(regionKey);
  const zone = cfg.shippingZones[0];
  const currency = zone?.currencyCode ?? cfg.defaultCurrency;
  const money = (minor: number) => formatMoney(createMoney(BigInt(minor), currency));
  const perKgRate = zone?.perKgRateMinorUnits;
  const threshold = zone?.freeShippingThresholdMinorUnits ?? cfg.freeShippingThresholdMinorUnits;

  return (
    <div className="bg-surface-page min-h-screen">
      <div className="container-content py-16 max-w-4xl">
        <header className="mb-12 text-center">
          <p className="text-ember font-bold text-sm uppercase tracking-widest mb-3">Storegrill {cfg.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-charcoal tracking-tight">Delivery options</h1>
          <p className="mt-4 text-smoke-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Everything below is specific to <strong className="text-charcoal font-bold">{cfg.name}</strong>. Prices are shown in {cfg.defaultCurrency}
            {' '}and delivery is handled by couriers operating in your country.
          </p>
        </header>

        {zone && (
          <>
            <section aria-labelledby="rates" className="mb-16">
              <h2 id="rates" className="text-2xl font-extrabold text-charcoal mb-6">Standard delivery rates</h2>
              <div className="bg-surface border border-border shadow-md rounded-[2rem] overflow-hidden">
                <table className="w-full text-smoke-600">
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-surface-raised transition-colors">
                      <th scope="row" className="text-left px-8 py-5 font-medium w-1/2">Base rate</th>
                      <td className="px-8 py-5 font-bold text-charcoal text-lg">{money(zone.baseRateMinorUnits)}</td>
                    </tr>
                    {perKgRate ? (
                      <tr className="hover:bg-surface-raised transition-colors">
                        <th scope="row" className="text-left px-8 py-5 font-medium">Heavy-item surcharge (per kg above 5 kg)</th>
                        <td className="px-8 py-5 font-bold text-charcoal text-lg">{money(perKgRate)}/kg</td>
                      </tr>
                    ) : null}
                    <tr className="bg-ember/5 border-ember/20 border-t-2">
                      <th scope="row" className="text-left px-8 py-5 font-medium text-ember">Free delivery threshold</th>
                      <td className="px-8 py-5 font-extrabold text-ember text-lg">
                        Orders over {money(threshold)}
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-raised transition-colors border-t border-border">
                      <th scope="row" className="text-left px-8 py-5 font-medium">Estimated delivery time</th>
                      <td className="px-8 py-5 font-bold text-charcoal text-lg">
                        {zone.estimatedDaysMin}–{zone.estimatedDaysMax} working days
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="carriers" className="mb-16 bg-surface-raised border border-border rounded-[2rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tealink/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
              <h2 id="carriers" className="text-2xl font-extrabold text-charcoal mb-6">Courier partners</h2>
              <ul className="flex flex-wrap gap-3 mb-6" role="list">
                {zone.carriers.map(c => (
                  <li key={c} className="px-5 py-2.5 rounded-xl border-2 border-border bg-surface text-charcoal font-bold shadow-sm">
                    {c}
                  </li>
                ))}
              </ul>
              <p className="text-smoke-600 leading-relaxed text-lg">
                We deliver to: {zone.countries.join(', ')}. Remote areas may add 1–2 working days.
                You will receive a tracking number by email as soon as your parcel is collected.
              </p>
            </section>
          </>
        )}

        <section aria-labelledby="collect" className="mb-16">
          <h2 id="collect" className="text-2xl font-extrabold text-charcoal mb-6">Collection points</h2>
          <div className="bg-surface border border-border shadow-md rounded-[2rem] p-8 md:p-10 space-y-6 text-smoke-600 leading-relaxed text-lg">
            <p>
              Where our courier partners operate pickup stations you can choose “collect” at checkout and
              pay no base delivery rate. Collection points are shown after you enter your address.
            </p>
          </div>
        </section>

        <footer className="mt-16 p-10 border-t border-border text-center max-w-2xl mx-auto">
          <h2 id="taxnote" className="text-xl font-bold text-charcoal mb-4">Duties &amp; taxes</h2>
          <p className="text-smoke-500 leading-relaxed">
            Prices displayed for {cfg.name} already include {cfg.taxRules[0]?.name ?? 'VAT'}
            {' '}({Math.round((cfg.taxRules[0]?.rate ?? 0) * 1000) / 10}%). Import duty is not charged on domestic orders.
          </p>
        </footer>
      </div>
    </div>
  );
}
