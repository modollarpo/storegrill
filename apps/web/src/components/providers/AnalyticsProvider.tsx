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
  eventId?: string;
}

type GtagArgs = [string, ...unknown[]];
type DataLayerEntry = GtagArgs | DataLayerEvent;
type FbqArgs = [string, ...unknown[]];
type PintrkArgs = [string, ...unknown[]];

interface FbqFn {
  (...args: FbqArgs): void;
  q: FbqArgs[];
  push: (args: FbqArgs) => void;
  loaded?: boolean;
  version?: string;
}

interface PintrkFn {
  (...args: PintrkArgs): void;
  q: PintrkArgs[];
  push: (args: PintrkArgs) => void;
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    dataLayer: DataLayerEntry[];
    gtag?: (...args: GtagArgs) => void;
    fbq?: FbqFn;
    _fbq?: FbqFn;
    pintrk?: PintrkFn;
    _pintrk?: PintrkFn;
  }
}

interface AnalyticsContextType {
  track: (event: DataLayerEvent, onEventSent?: () => void) => void;
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
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const PINTEREST_PIXEL_ID = process.env.NEXT_PUBLIC_PINTEREST_PIXEL_ID;
const gtagEnabled = Boolean(GA4_ID || ADS_ID);
const fbqEnabled = Boolean(FB_PIXEL_ID);
const pintrkEnabled = Boolean(PINTEREST_PIXEL_ID);

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

function marketingGranted(consent: CookieConsent | null) {
  return Boolean(consent?.marketing);
}

function loadFbq() {
  if (typeof window === 'undefined' || !FB_PIXEL_ID || window.fbq) return;
  const queue: FbqArgs[] = [];
  const fbq = ((...args: FbqArgs) => { queue.push(args); }) as FbqFn;
  fbq.q = queue;
  fbq.push = (args) => { queue.push(args); };
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
}

function initFbq() {
  if (!FB_PIXEL_ID || !marketingGranted(readConsent())) return;
  loadFbq();
  window.fbq?.('init', FB_PIXEL_ID);
}

function loadPintrk() {
  if (typeof window === 'undefined' || !PINTEREST_PIXEL_ID || window.pintrk) return;
  const queue: PintrkArgs[] = [];
  const pintrk = ((...args: PintrkArgs) => { queue.push(args); }) as PintrkFn;
  pintrk.q = queue;
  pintrk.push = (args) => { queue.push(args); };
  pintrk.loaded = true;
  pintrk.version = '3.0';
  window.pintrk = pintrk;
  window._pintrk = pintrk;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://s.pinimg.com/ct/core.js';
  document.head.appendChild(script);
}

function initPintrk() {
  if (!PINTEREST_PIXEL_ID || !marketingGranted(readConsent())) return;
  loadPintrk();
  window.pintrk?.('load', PINTEREST_PIXEL_ID);
}

function toPintrkEvent(event: DataLayerEvent): { name: string; params: Record<string, unknown> } | null {
  const contents = event.items?.map(i => ({
    id: i.item_id,
    quantity: i.quantity ?? 1,
    item_price: i.price,
  }));
  switch (event.event) {
    case 'page_view':
      return { name: 'page_visit', params: {} };
    case 'searchhit':
      return { name: 'search', params: { search_string: event.search_term || '' } };
    case 'detail':
    case 'view_item':
      return {
        name: 'view_content',
        params: {
          content_ids: [event.product_id],
          content_name: event.product_name,
          content_type: 'product',
          currency: event.currency,
          value: event.value,
        },
      };
    case 'add_to_cart':
      return { name: 'add_to_cart', params: { contents, currency: event.currency, value: event.value } };
    case 'begin_checkout':
      return {
        name: 'check_out',
        params: { contents, currency: event.currency, value: event.value, num_items: contents?.length },
      };
    case 'purchase':
      return {
        name: 'check_out',
        params: {
          contents,
          content_type: 'product',
          currency: event.currency,
          value: event.value,
          order_id: event.transaction_id,
        },
      };
    default:
      return null;
  }
}

function toFbqEvent(event: DataLayerEvent): { name: string; params: Record<string, unknown> } | null {
  const contents = event.items?.map(i => ({
    id: i.item_id,
    quantity: i.quantity ?? 1,
    item_price: i.price,
  }));
  switch (event.event) {
    case 'page_view':
      return { name: 'PageView', params: {} };
    case 'searchhit':
      return { name: 'Search', params: { search_string: event.search_term || '' } };
    case 'detail':
    case 'view_item':
      return {
        name: 'ViewContent',
        params: {
          content_ids: [event.product_id],
          content_name: event.product_name,
          content_type: 'product',
          currency: event.currency,
          value: event.value,
        },
      };
    case 'add_to_cart':
      return { name: 'AddToCart', params: { contents, currency: event.currency, value: event.value } };
    case 'begin_checkout':
      return {
        name: 'InitiateCheckout',
        params: { contents, currency: event.currency, value: event.value, num_items: contents?.length },
      };
    case 'purchase':
      return {
        name: 'Purchase',
        params: {
          contents,
          content_type: 'product',
          currency: event.currency,
          value: event.value,
          order_id: event.transaction_id,
        },
      };
    default:
      return null;
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

function toInternalEvent(event: DataLayerEvent, eventId: string) {
  const metadata: Record<string, unknown> = {};
  if (event.transaction_id) metadata.orderNumber = event.transaction_id;
  if (event.items?.length) {
    metadata.items = event.items.map(i => ({ id: i.item_id, name: i.item_name, qty: i.quantity, price: i.price }));
  }
  const entityType =
    event.event === 'purchase' ? 'order'
    : event.event === 'page_view' || event.event === 'searchhit' || event.event === 'detail' ? undefined
    : 'product';
  return {
    eventType: event.event,
    entityType,
    entityId: event.event === 'detail' ? event.product_id : (event.product_id || event.items?.[0]?.item_id),
    value: event.value,
    metadata,
    eventId,
    currency: event.currency,
    searchTerm: event.search_term,
  };
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gtagInitialized = useRef(false);
  const fbqInitialized = useRef(false);
  const pintrkInitialized = useRef(false);
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    if (!gtagEnabled && !fbqEnabled && !pintrkEnabled) return;

    if (gtagEnabled && !gtagInitialized.current) {
      gtagInitialized.current = true;
      loadGtag();
    }
    if (fbqEnabled && !fbqInitialized.current) initFbq();
    if (pintrkEnabled && !pintrkInitialized.current) initPintrk();

    const onConsentChanged = () => {
      const consent = readConsent();
      if (gtagEnabled) updateConsent(consent);
      if (fbqEnabled && !fbqInitialized.current) {
        initFbq();
        if (window.fbq && marketingGranted(consent)) {
          fbqInitialized.current = true;
          window.fbq('track', 'PageView');
        }
      }
      if (pintrkEnabled && !pintrkInitialized.current) {
        initPintrk();
        if (window.pintrk && marketingGranted(consent)) {
          pintrkInitialized.current = true;
          window.pintrk('track', 'page_visit');
        }
      }
    };
    window.addEventListener('storegrill:consent-changed', onConsentChanged);
    return () => window.removeEventListener('storegrill:consent-changed', onConsentChanged);
  }, []);

  const track = useCallback((event: DataLayerEvent, onEventSent?: () => void) => {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];

    const eventId = event.eventId ?? crypto.randomUUID();
    const mapped = toGtagEvent(event);
    window.dataLayer.push(event);

    let sent = false;
    const markSent = () => {
      if (!sent) {
        sent = true;
        onEventSent?.();
      }
    };

    if (gtagEnabled && window.gtag && mapped) {
      if (event.event === 'purchase') {
        window.gtag('event', mapped.name, {
          ...mapped.params,
          event_callback: markSent,
          event_timeout: 2000,
        });
      } else {
        window.gtag('event', mapped.name, mapped.params);
      }
    } else {
      markSent();
    }

    if (ADS_ID && ADS_CONVERSION_LABEL && event.event === 'purchase') {
      window.gtag?.('event', 'conversion', {
        send_to: `${ADS_ID}/${ADS_CONVERSION_LABEL}`,
        value: event.value,
        currency: event.currency,
        transaction_id: event.transaction_id,
        event_callback: markSent,
        event_timeout: 2000,
      });
    }

    if (fbqEnabled && window.fbq && marketingGranted(readConsent())) {
      const fbqEvent = toFbqEvent(event);
      if (fbqEvent) window.fbq(fbqEvent.name, { ...fbqEvent.params, event_id: eventId });
    }

    if (pintrkEnabled && window.pintrk && marketingGranted(readConsent())) {
      const pintrkEvent = toPintrkEvent(event);
      if (pintrkEvent) window.pintrk('track', pintrkEvent.name, { ...pintrkEvent.params, event_id: eventId });
    }

    const EVENT_TYPES_TO_INTERNAL = new Set(['page_view', 'searchhit', 'detail', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase']);
    if (EVENT_TYPES_TO_INTERNAL.has(event.event)) {
      fetch(`${API_BASE}/api/v1/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInternalEvent(event, eventId)),
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
      lastPathname.current = pathname;
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
