'use client';

import { useEffect } from 'react';
import { GCR_BADGE_SRC, GCR_MERCHANT_ID } from '@/lib/google-reviews';

const WIDGET_SCRIPT_ID = 'merchantWidgetScript';

export function GoogleReviewsBadge() {
  useEffect(() => {
    if (document.getElementById(WIDGET_SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = WIDGET_SCRIPT_ID;
    script.src = GCR_BADGE_SRC;
    script.defer = true;
    script.addEventListener('load', () => {
      window.merchantwidget?.start({ merchant_id: GCR_MERCHANT_ID, position: 'BOTTOM_RIGHT' });
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return null;
}