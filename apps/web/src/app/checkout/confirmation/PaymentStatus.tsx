'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type State = 'idle' | 'settling' | 'paid' | 'failed';

export function PaymentStatus({ sessionId, paypalOrderId }: { sessionId?: string; paypalOrderId?: string }) {
  const [state, setState] = useState<State>(sessionId || paypalOrderId ? 'settling' : 'idle');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || (!sessionId && !paypalOrderId)) return;
    attempted.current = true;

    async function settle() {
      try {
        if (sessionId) {
          const r = await api<{ settled: boolean }>('/api/v1/payments/stripe/settle', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
          });
          setState(r.settled ? 'paid' : 'failed');
        } else if (paypalOrderId) {
          await api('/api/v1/payments/paypal/capture', {
            method: 'POST',
            body: JSON.stringify({ paypalOrderId }),
          });
          setState('paid');
        }
      } catch {
        setState('failed');
      }
    }
    void settle();
  }, [sessionId, paypalOrderId]);

  if (state === 'idle') return null;

  if (state === 'settling') {
    return (
      <p role="status" className="mt-5 text-sm font-semibold text-smoke-600">
        Confirming your payment… one moment.
      </p>
    );
  }

  if (state === 'failed') {
    return (
      <p role="alert" className="mt-5 rounded-md bg-feedback-danger/10 border border-feedback-danger/30 text-feedback-danger text-xs font-medium px-4 py-3">
        We couldn&apos;t confirm your payment yet. If you completed it at the provider, don&apos;t worry — your order is safe
        and will update automatically. Otherwise you can retry from your basket.
      </p>
    );
  }

  return (
    <p className="mt-5 text-xs font-bold text-feedback-success uppercase tracking-wide" role="status">
      Payment confirmed
    </p>
  );
}
