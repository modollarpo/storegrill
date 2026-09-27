import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { writeConsent, CONSENT_COOKIE } from '@/lib/consent';

const PIXEL_ID = '1143986500227216';

type FbqCall = [string, ...unknown[]];

function stubPixel() {
  const calls: FbqCall[] = [];
  const fbq = ((...args: FbqCall) => {
    calls.push(args);
  }) as ((...args: FbqCall) => void) & { q: FbqCall[]; push: (args: FbqCall) => void };
  fbq.q = [];
  fbq.push = () => {};
  window.fbq = fbq;
  return calls;
}

function events(calls: FbqCall[]) {
  return calls.filter(c => c[0] !== 'init');
}

function clearCookie() {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
}

function grantMarketing() {
  writeConsent({ analytics: true, marketing: true });
}

function denyAll() {
  writeConsent({ analytics: false, marketing: false });
}

type TrackFn = (event: import('./AnalyticsProvider').DataLayerEvent) => void;

async function renderProvider() {
  vi.resetModules();
  const { AnalyticsProvider, useAnalytics } = await import('./AnalyticsProvider');
  let track: TrackFn = () => {};
  function Tracker() {
    track = useAnalytics().track as unknown as TrackFn;
    return null;
  }
  render(
    <AnalyticsProvider>
      <Tracker />
    </AnalyticsProvider>,
  );
  return () => track;
}

describe('Meta Pixel', () => {
  beforeEach(() => {
    clearCookie();
    window.fbq = undefined;
    window._fbq = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCookie();
    window.fbq = undefined;
    window._fbq = undefined;
    document.querySelectorAll('script[src*="fbevents.js"]').forEach(el => el.remove());
  });

  it('maps page_view to PageView once marketing consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_PIXEL_ID', PIXEL_ID);
    const calls = stubPixel();
    grantMarketing();
    const getTrack = await renderProvider();

    act(() => { getTrack()({ event: 'page_view', page_type: 'homepage' }); });

    expect(events(calls).map(c => c[0])).toEqual(['PageView']);
  });

  it('maps the ecommerce funnel onto Meta standard events', async () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_PIXEL_ID', PIXEL_ID);
    const calls = stubPixel();
    grantMarketing();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'detail', product_id: 'p1', product_name: 'Desk Lamp', currency: 'GBP', value: 24.99 }); });
    act(() => { track({ event: 'add_to_cart', value: 24.99, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });
    act(() => { track({ event: 'begin_checkout', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });

    expect(events(calls).map(c => c[0])).toEqual(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']);
  });

  it('sends Meta content_ids on ViewContent and order_id on Purchase', async () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_PIXEL_ID', PIXEL_ID);
    const calls = stubPixel();
    grantMarketing();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'detail', product_id: 'p1', product_name: 'Desk Lamp', currency: 'GBP', value: 24.99 }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });

    const [view, purchase] = events(calls);
    expect(view[1]).toMatchObject({ content_ids: ['p1'], content_type: 'product', currency: 'GBP' });
    expect(purchase[1]).toMatchObject({ order_id: 'ORD-1', currency: 'GBP', value: 49.98 });
    expect((purchase[1] as { contents: unknown[] }).contents).toEqual([
      { id: 'p1', quantity: 2, item_price: 24.99 },
    ]);
  });

  it('does not load or fire the pixel when marketing consent is denied', async () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_PIXEL_ID', PIXEL_ID);
    const calls = stubPixel();
    denyAll();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'page_view', page_type: 'homepage' }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 10, currency: 'GBP' }); });

    expect(calls).toHaveLength(0);
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull();
  });

  it('fires no pixel events when NEXT_PUBLIC_FACEBOOK_PIXEL_ID is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_PIXEL_ID', '');
    const calls = stubPixel();
    grantMarketing();
    const getTrack = await renderProvider();

    act(() => { getTrack()({ event: 'page_view', page_type: 'homepage' }); });

    expect(calls).toHaveLength(0);
  });
});
