'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface CheckoutCouponProps {
  onApply: (code: string) => void;
  appliedCode?: string | null;
  appliedName?: string | null;
  onRemove?: () => void;
}

export function CheckoutCoupon({ onApply, appliedCode, appliedName, onRemove }: CheckoutCouponProps) {
  const [coupon, setCoupon] = useState('');
  const [state, setState] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const isValid = appliedCode && appliedName;

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-text-primary mb-4">Promo Code</h2>
      {isValid ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
          <p className="text-xs font-bold text-green-700">
            ✓ {appliedName} applied ({appliedCode})
          </p>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-xs font-bold text-text-secondary hover:text-red-600 underline underline-offset-2 shrink-0">
              Remove
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={coupon}
              onChange={e => {
                setCoupon(e.target.value.toUpperCase());
                setState('idle');
              }}
              placeholder="Enter promo code"
              className={cn(
                'input h-10 flex-1 text-sm border-border rounded-xs bg-surface-sunken focus:border-ember',
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
        </>
      )}
    </div>
  );
}
