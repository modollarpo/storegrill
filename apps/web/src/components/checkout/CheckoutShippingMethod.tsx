import { cn } from '@/lib/utils';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  priceMinorUnits: number;
  currencyCode: string;
}

export function CheckoutShippingMethod({ 
  methods, 
  selectedId, 
  onSelect 
}: { 
  methods: ShippingMethod[], 
  selectedId: string, 
  onSelect: (id: string) => void 
}) {
  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">Shipping Method</h2>
      <div className="space-y-3">
        {methods.map(method => (
          <label
            key={method.id}
            className={cn(
              'flex items-center justify-between p-4 border-2 rounded-md cursor-pointer transition-all',
              selectedId === method.id ? 'border-ember bg-ember/5 shadow-sm' : 'border-border hover:border-ember'
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                className="w-4 h-4 accent-ember"
                checked={selectedId === method.id}
                onChange={() => onSelect(method.id)}
              />
              <div>
                <span className="block text-sm font-extrabold text-text-primary">{method.name}</span>
                <span className="block text-xs text-text-secondary">{method.description}</span>
              </div>
            </div>
            <span className="text-sm font-bold text-text-primary">
              {method.priceMinorUnits === 0 
                ? <span className="text-emerald-600">FREE</span>
                : <PriceDisplay amountMinorUnits={method.priceMinorUnits} currencyCode={method.currencyCode} size="sm" />
              }
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
