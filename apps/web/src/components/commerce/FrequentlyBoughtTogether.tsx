'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/providers/CartContext';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { useToast } from '@/components/feedback/Toast';
import { storefrontImage } from '@/lib/images';

export interface BundleItem {
  id: string;
  slug?: string;
  name: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
  thumbnail?: string | null;
  categoryId?: string;
}

export function FrequentlyBoughtTogether({
  main,
  companions,
}: {
  main: BundleItem;
  companions: BundleItem[];
}) {
  const cart = useCart();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(companions.map(c => [c.id, true]))
  );
  const [added, setAdded] = useState(false);

  const lines = useMemo(
    () => [main, ...companions.filter(c => selected[c.id])],
    [main, companions, selected]
  );
  const currency = main.currencyCode;
  const total = lines.reduce((sum, l) => sum + l.unitPriceMinorUnits, 0);

  function toggle(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
    setAdded(false);
  }

  function addAll() {
    for (const line of lines) {
      cart.addItem({
        productId: line.id,
        name: line.name,
        slug: line.slug,
        image: line.thumbnail || undefined,
        unitPriceMinorUnits: line.unitPriceMinorUnits,
        currencyCode: line.currencyCode,
        quantity: 1,
        stock: 25,
        categoryId: line.categoryId,
      });
    }
    setAdded(true);
    toast({
      variant: 'success',
      title: `${lines.length} items added to basket`,
      description: 'Your bundle is ready in the basket.',
    });
  }

  return (
    <section className="card p-5 mt-10" aria-labelledby="fbt-heading" data-testid="frequently-bought-together">
      <h2 id="fbt-heading" className="text-displaysm font-semibold text-charcoal">Frequently bought together</h2>
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-5">
        <ul className="flex-1 flex flex-wrap items-center gap-y-3">
          {lines.map((item, i) => (
            <li key={item.id} className="flex items-center">
              {i > 0 && <span aria-hidden="true" className="mx-3 text-xl font-light text-smoke-400">+</span>}
              <label className="flex items-start gap-2.5 cursor-pointer max-w-[15rem]">
                <input
                  type="checkbox"
                  checked={Boolean(selected[item.id])}
                  onChange={() => toggle(item.id)}
                  disabled={item.id === main.id}
                  className="mt-1 h-4 w-4 accent-[var(--color-action-primary)] shrink-0"
                />
                <span className="flex items-start gap-2 min-w-0">
                  <span className="w-12 h-12 rounded-sm bg-smoke-100 grid place-items-center overflow-hidden shrink-0">
                    {storefrontImage(item.thumbnail ?? undefined) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={storefrontImage(item.thumbnail ?? undefined)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span aria-hidden="true" className="text-2xs text-smoke-400">IMG</span>
                    )}
                  </span>
                  <span className="min-w-0 text-xs leading-snug">
                    <Link href={item.slug ? `/products/${item.slug}` : '#'} className={cnName(item.id === main.id)}>
                      {item.name}
                    </Link>
                    <PriceDisplay amountMinorUnits={item.unitPriceMinorUnits} currencyCode={item.currencyCode} size="sm" />
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="shrink-0 lg:text-right lg:min-w-[11rem]">
          <p className="text-xs text-smoke-600">
            Total for {lines.length} {lines.length === 1 ? 'item' : 'items'}
          </p>
          <p className="text-lg font-bold text-charcoal mt-0.5">
            <PriceDisplay amountMinorUnits={total} currencyCode={currency} size="lg" />
          </p>
          <button
            type="button"
            onClick={addAll}
            className="btn btn-primary w-full lg:w-auto mt-2 whitespace-nowrap"
            data-testid="add-bundle"
          >
            {added ? 'Added ✓' : 'Add all to basket'}
          </button>
        </div>
      </div>
    </section>
  );
}

function cnName(isMain: boolean): string {
  return isMain
    ? 'font-semibold text-charcoal hover:underline underline-offset-2'
    : 'text-smoke-700 hover:text-ember hover:underline underline-offset-2';
}
