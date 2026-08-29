import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import Image from 'next/image';
import { storefrontImage } from '@/lib/images';

interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceMinorUnits: number;
  currencyCode: string;
  thumbnail?: string;
}

export function CheckoutOrderSummary({ items, subtotal, currency, discount = 0, shipping = 0, tax = 0, total, couponCode }: { items: OrderSummaryItem[], subtotal: number, currency: string, discount?: number, shipping?: number, tax?: number, total?: number, couponCode?: string | null }) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">Order Summary</h2>
      <ul className="divide-y divide-border">
        {items.map(item => (
          <li key={item.id} className="py-4 flex gap-4">
            <div className="relative w-16 h-16 shrink-0 rounded-xs overflow-hidden border border-border bg-surface-sunken">
              {item.thumbnail && <Image src={storefrontImage(item.thumbnail) || '/product-placeholder.svg'} alt="" fill sizes="64px" className="object-contain p-1.5 mix-blend-multiply" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary line-clamp-2">{item.name}</p>
              <p className="text-sm text-text-secondary">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-bold text-text-primary">
              <PriceDisplay amountMinorUnits={item.unitPriceMinorUnits * item.quantity} currencyCode={currency} size="sm" />
            </p>
          </li>
        ))}
      </ul>
      <div className="border-t border-border pt-4 mt-2 flex justify-between items-baseline">
        <dt className="text-base font-bold text-text-primary">Subtotal</dt>
        <dd className="text-base font-bold text-text-primary">
          <PriceDisplay amountMinorUnits={subtotal} currencyCode={currency} size="sm" />
        </dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between items-baseline gap-2">
          <dt className="text-base font-bold text-green-600">Discount{couponCode ? ` (${couponCode})` : ''}</dt>
          <dd className="text-base font-bold text-green-600">
            −<PriceDisplay amountMinorUnits={discount} currencyCode={currency} size="sm" />
          </dd>
        </div>
      )}
      {shipping !== undefined && (
        <div className="flex justify-between items-baseline">
          <dt className="text-base font-bold text-text-primary">Shipping</dt>
          <dd className="text-base font-bold text-text-primary">
            {shipping === 0 ? <span className="text-green-600">FREE</span> : <PriceDisplay amountMinorUnits={shipping} currencyCode={currency} size="sm" />}
          </dd>
        </div>
      )}
      {tax !== undefined && (
        <div className="flex justify-between items-baseline">
          <dt className="text-base font-bold text-text-primary">Tax</dt>
          <dd className="text-base font-bold text-text-primary">
            <PriceDisplay amountMinorUnits={tax} currencyCode={currency} size="sm" />
          </dd>
        </div>
      )}
      {total !== undefined && (
        <div className="border-t border-border pt-4 mt-2 flex justify-between items-baseline">
          <dt className="text-xl font-extrabold text-text-primary">Total</dt>
          <dd className="text-xl font-extrabold text-text-primary">
            <PriceDisplay amountMinorUnits={total} currencyCode={currency} size="xl" />
          </dd>
        </div>
      )}
    </div>
  );
}
