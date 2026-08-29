import { cn } from '@/lib/utils';
import Image from 'next/image';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: '/checkout/bank.svg' },
  { id: 'paypal', name: 'PayPal', icon: '/checkout/paypal.svg' },
];

export function CheckoutPaymentMethod({ 
  selectedId, 
  onSelect 
}: { 
  selectedId: string, 
  onSelect: (id: string) => void 
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">Payment Method</h2>
      <div className="space-y-3">
        {PAYMENT_METHODS.map(method => (
          <label
            key={method.id}
            className={cn(
              'flex items-center gap-3 p-4 border-2 rounded-md cursor-pointer transition-all',
              selectedId === method.id ? 'border-ember bg-ember/5 shadow-sm' : 'border-border hover:border-ember'
            )}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="w-4 h-4 accent-ember"
              checked={selectedId === method.id}
              onChange={() => onSelect(method.id)}
            />
            <div className="relative w-10 h-6">
                <Image src={method.icon} alt="" fill className="object-contain" />
            </div>
            <span className="text-sm font-extrabold text-text-primary">{method.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
