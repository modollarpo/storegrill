'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function CheckoutCoupon({ onApply }: { onApply: (code: string) => void }) {
  const [coupon, setCoupon] = useState('');
  const [state, setState] = useState<'idle' | 'valid' | 'invalid'>('idle');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-gray-900 mb-4">Promo Code</h2>
      <div className="flex gap-2">
        <input
          value={coupon}
          onChange={e => {
            setCoupon(e.target.value.toUpperCase());
            setState('idle');
          }}
          placeholder="Enter promo code"
          className={cn(
            'input h-10 flex-1 text-sm border-gray-200 rounded-xs bg-gray-50 focus:border-[#0071DC]',
            state === 'invalid' && 'border-red-600'
          )}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const isValid = /^[A-Z0-9-]{4,}$/.test(coupon);
            setState(isValid ? 'valid' : 'invalid');
            if (isValid) onApply(coupon);
          }}
          disabled={!coupon}
        >
          Apply
        </Button>
      </div>
      {state === 'invalid' && <p className="text-xs text-red-600 font-bold mt-2">Invalid code.</p>}
      {state === 'valid' && <p className="text-xs text-emerald-600 font-bold mt-2">Code applied!</p>}
    </div>
  );
}
