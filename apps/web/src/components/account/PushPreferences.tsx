'use client';

import { useState, useEffect } from 'react';
import { registerPushNotifications } from '@/lib/push';
import { useToast } from '@/components/feedback/Toast';

export function PushPreferences() {
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true);
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setSubscribed(true);
          });
        });
      }
    }
  }, []);

  async function handleToggle() {
    setLoading(true);
    try {
      if (!subscribed) {
        await registerPushNotifications();
        setSubscribed(true);
        toast({ variant: 'success', title: 'Push alerts enabled', description: 'You will now receive order updates, price drops, and flash sale alerts.' });
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast({ variant: 'info', title: 'Push alerts disabled', description: 'You have unsubscribed from browser push alerts.' });
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Subscription failed', description: err instanceof Error ? err.message : 'Could not update push notification settings.' });
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <section aria-label="Push Notifications" className="mt-8 card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-charcoal">E-Commerce Push Alerts</h3>
          <p className="text-2xs text-smoke-500 mt-0.5">Receive instant updates on order status, wishlist price drops, and abandoned cart reminders.</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={handleToggle}
          className={`btn btn-sm shrink-0 ${subscribed ? 'btn-outline text-ember' : 'btn-primary'}`}
        >
          {loading ? 'Processing…' : subscribed ? 'Disable Alerts' : 'Enable Alerts'}
        </button>
      </div>
    </section>
  );
}
