'use client';

import { createContext, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { readConsent, CookieConsent } from '@/lib/consent';
import { API_BASE } from '@/lib/api';

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

export interface DataLayerEvent {
  event: 'page_view' | 'searchhit' | 'detail' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';
  page_type?: string;
  search_term?: string;
  product_id?: string;
  product_name?: string;
  category?: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
  items?: EcommerceItem[];
  ecommerce?: any;
}

type GtagArgs = [string, ...unknown[]];
type DataLayerEntry = GtagArgs | DataLayerEvent;

declare global {
  interface Window {
    dataLayer: DataLayerEntry[];
    gtag?: (...args: GtagArgs) => void;
  }
}

interface AnalyticsContextType {
  track: (event: DataLayerEvent) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  track: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
const gtagEnabled = Boolean(GA4_ID || ADS_ID);

function consentState(consent: CookieConsent | null) {
  return {
    ad_storage: consent?.marketing ? 'granted' : 'denied',
    ad_user_data: consent?.marketing ? 'granted' : 'denied',
    ad_personalization: consent?.marketing ? 'granted' : 'denied',
    analytics_storage: consent?.analytics ? 'granted' : 'denied',
  };
}

function addConsentDefault(consent: CookieConsent | null) {
  window.dataLayer.push(['consent', 'default', { ...consentState(consent), wait_for_update: 500 }]);
}

function updateConsent(consent: CookieConsent | null) {
  window.dataLayer.push(['consent', 'update', consentState(consent)]);
}

function loadGtag() {
  if (typeof window === 'undefined' || !gtagEnabled) return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: GtagArgs) {
      window.dataLayer.push(args);
    };
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID || ADS_ID || '')}`;
    document.head.appendChild(script);
    window.dataLayer.push(['js', new Date() as unknown as string]);
    addConsentDefault(readConsent());
    if (GA4_ID) window.dataLayer.push(['config', GA4_ID]);
    if (ADS_ID) window.dataLayer.push(['config', ADS_ID]);
  }
}

function toGtagEvent(event: DataLayerEvent): { name: string; params: Record<string, unknown> } | null {
  switch (event.event) {
    case 'searchhit':
      return { name: 'search', params: { search_term: event.search_term || '' } };
    case 'detail':
    case 'view_item':
      return { name: 'view_item', params: { currency: event.currency, value: event.value, items: event.items || [] } };
    case 'add_to_cart':
      return { name: 'add_to_cart', params: { currency: event.currency, value: event.value, items: event.items || [] } };
    case 'begin_checkout':
      return { name: 'begin_checkout', params: { currency: event.currency, value: event.value, items: event.items || [] } };
    case 'purchase':
      return {
        name: 'purchase',
        params: {
          transaction_id: event.transaction_id,
          currency: event.currency,
          value: event.value,
          items: event.items || [],
        },
      };
    default:
      return null;
  }
}

function toInternalEvent(event: DataLayerEvent) {
  const metadata: Record<string, unknown> = {};
  if (event.transaction_id) metadata.orderNumber = event.transaction_id;
  if (event.items?.length) {
    metadata.items = event.items.map(i => ({ id: i.item_id, name: i.item_name, qty: i.quantity, price: i.price }));
  }
  return {
    eventType: event.event,
    entityType: event.event === 'purchase' ? 'order' : 'product',
    entityId: event.product_id || event.items?.[0]?.item_id,
    value: event.value,
    metadata,
  };
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gtagInitialized = useRef(false);

  useEffect(() => {
    if (!gtagEnabled || gtagInitialized.current) return;
    gtagInitialized.current = true;
    loadGtag();
    const onConsentChanged = () => updateConsent(readConsent());
    window.addEventListener('storegrill:consent-changed', onConsentChanged);
    return () => window.removeEventListener('storegrill:consent-changed', onConsentChanged);
  }, []);

  const track = useCallback((event: DataLayerEvent) => {
    if (typeof window === 'undefined') return;

    const mapped = toGtagEvent(event);
    window.dataLayer.push(event);

    if (gtagEnabled && window.gtag && mapped) {
      window.gtag('event', mapped.name, mapped.params);
    }

    if (ADS_ID && ADS_CONVERSION_LABEL && event.event === 'purchase') {
      window.gtag?.('event', 'conversion', {
        send_to: `${ADS_ID}/${ADS_CONVERSION_LABEL}`,
        value: event.value,
        currency: event.currency,
        transaction_id: event.transaction_id,
      });
    }

    if (event.event === 'add_to_cart' || event.event === 'begin_checkout' || event.event === 'purchase' || event.event === 'view_item') {
      fetch(`${API_BASE}/api/v1/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInternalEvent(event)),
        keepalive: true,
      }).catch(() => {});
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics]', event, mapped);
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname) {
      const pageType = pathname === '/' ? 'homepage' 
        : pathname.startsWith('/products/') ? 'product_detail'
        : pathname.startsWith('/products') ? 'category_list'
        : pathname.startsWith('/search') ? 'search_results'
        : pathname.startsWith('/cart') ? 'cart'
        : pathname.startsWith('/checkout') ? 'checkout'
        : 'other';

      track({
        event: 'page_view',
        page_type: pageType,
      });
      
      if (pageType === 'search_results' && searchParams) {
        track({
          event: 'searchhit',
          search_term: searchParams.get('q') || '',
        });
      }
    }
  }, [pathname, searchParams, track]);

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
