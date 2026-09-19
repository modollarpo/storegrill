'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { GCR_MERCHANT_ID, GCR_OPTIN_PLATFORM_SRC } from '@/lib/google-reviews';

interface GcrOptInOrder {
  orderNumber: string;
  email: string;
  deliveryCountry: string;
  estimatedDeliveryDate: string;
}

export function GoogleCustomerReviewsOptIn({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<GcrOptInOrder | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    let cancelled = false;
    api<{ order: GcrOptInOrder }>(`/api/v1/orders/gcr-optin/${encodeURIComponent(orderNumber)}`)
      .then((res) => {
        if (!cancelled) setOrder(res.order);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  useEffect(() => {
    if (!order) return;

    window.renderOptIn = () => {
      window.gapi?.load('surveyoptin', () => {
        window.gapi?.surveyoptin?.render({
          merchant_id: GCR_MERCHANT_ID,
          order_id: order.orderNumber,
          email: order.email,
          delivery_country: order.deliveryCountry,
          estimated_delivery_date: order.estimatedDeliveryDate,
        });
      });
    };

    if (typeof window.gapi?.load === 'function') {
      window.renderOptIn();
      return;
    }

    const script = document.createElement('script');
    script.src = GCR_OPTIN_PLATFORM_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [order]);

  return null;
}