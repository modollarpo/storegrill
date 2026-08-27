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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-gray-900 mb-4">Shipping Method</h2>
      <div className="space-y-3">
        {methods.map(method => (
          <label
            key={method.id}
            className={cn(
              'flex items-center justify-between p-4 border-2 rounded-md cursor-pointer transition-all',
              selectedId === method.id ? 'border-[#0071DC] bg-[#0071DC]/5 shadow-sm' : 'border-gray-200 hover:border-[#0071DC]'
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                className="w-4 h-4 accent-[#0071DC]"
                checked={selectedId === method.id}
                onChange={() => onSelect(method.id)}
              />
              <div>
                <span className="block text-sm font-extrabold text-gray-900">{method.name}</span>
                <span className="block text-xs text-gray-500">{method.description}</span>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900">
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
