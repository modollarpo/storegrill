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
    <div className="container-site py-10 max-w-4xl">
      <p className="text-ember font-bold text-xs uppercase tracking-[0.2em]">Storegrill {cfg.name}</p>
      <h1 className="mt-2 text-displaymd font-semibold text-charcoal">Delivery options</h1>
      <p className="mt-3 text-sm text-smoke-600 leading-relaxed">
        Everything below is specific to <strong>{cfg.name}</strong>. Prices are shown in {cfg.defaultCurrency}
        {' '}and delivery is handled by couriers operating in your country.
      </p>

      {zone && (
        <>
          <section aria-labelledby="rates" className="mt-8">
            <h2 id="rates" className="text-displaysm font-semibold text-charcoal mb-3">Standard delivery rates</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-smoke-100">
                  <tr>
                    <th scope="row" className="text-left px-5 py-3.5 font-medium text-smoke-600 w-1/2">Base rate</th>
                    <td className="px-5 py-3.5 font-bold text-charcoal">{money(zone.baseRateMinorUnits)}</td>
                  </tr>
                  {perKgRate ? (
                    <tr>
                      <th scope="row" className="text-left px-5 py-3.5 font-medium text-smoke-600">Heavy-item surcharge (per kg above 5 kg)</th>
                      <td className="px-5 py-3.5 font-bold text-charcoal">{money(perKgRate)}/kg</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row" className="text-left px-5 py-3.5 font-medium text-smoke-600">Free delivery threshold</th>
                    <td className="px-5 py-3.5 font-bold text-charcoal">
                      Orders over {money(threshold)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="text-left px-5 py-3.5 font-medium text-smoke-600">Estimated delivery time</th>
                    <td className="px-5 py-3.5 font-bold text-charcoal">
                      {zone.estimatedDaysMin}–{zone.estimatedDaysMax} working days
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="carriers" className="mt-8">
            <h2 id="carriers" className="text-displaysm font-semibold text-charcoal mb-3">Courier partners</h2>
            <ul className="flex flex-wrap gap-2" role="list">
              {zone.carriers.map(c => (
                <li key={c} className="px-4 py-2 rounded-full border border-smoke-150 bg-surface-raised text-sm font-semibold text-charcoal">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-smoke-500 leading-relaxed">
              We deliver to: {zone.countries.join(', ')}. Remote areas may add 1–2 working days.
              You will receive a tracking number by email as soon as your parcel is collected.
            </p>
          </section>
        </>
      )}

      <section aria-labelledby="collect" className="mt-8">
        <h2 id="collect" className="text-displaysm font-semibold text-charcoal mb-3">Collection points</h2>
        <p className="text-sm text-smoke-600 leading-relaxed">
          Where our courier partners operate pickup stations you can choose “collect” at checkout and
          pay no base delivery rate. Collection points are shown after you enter your address.
        </p>
      </section>

      <section aria-labelledby="taxnote" className="mt-8 card p-6">
        <h2 id="taxnote" className="text-sm font-bold text-charcoal">Duties &amp; taxes</h2>
        <p className="mt-2 text-xs text-smoke-600 leading-relaxed">
          Prices displayed for {cfg.name} already include {cfg.taxRules[0]?.name ?? 'VAT'}
          {' '}({Math.round((cfg.taxRules[0]?.rate ?? 0) * 1000) / 10}%). Import duty is not charged on domestic orders.
        </p>
      </section>
    </div>
  );
}
