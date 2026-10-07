import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { writeConsent, CONSENT_COOKIE } from '@/lib/consent';

const PIXEL_ID = '1143986500227216';
const PINTEREST_PIXEL_ID = '2614298179740';

type FbqCall = [string, ...unknown[]];
type PintrkCall = [string, ...unknown[]];

function sha256Hex(value: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(value))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

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

function stubPintrk() {
  const calls: PintrkCall[] = [];
  const pintrk = ((...args: PintrkCall) => {
    calls.push(args);
  }) as ((...args: PintrkCall) => void) & { q: PintrkCall[]; push: (args: PintrkCall) => void };
  pintrk.q = [];
  pintrk.push = () => {};
  window.pintrk = pintrk;
  return calls;
}

function events(calls: FbqCall[]) {
  return calls.filter(c => c[0] !== 'init');
}

function pintrkEvents(calls: PintrkCall[]) {
  return calls.filter(c => c[0] === 'track').map(c => [c[1], c[2]] as PintrkCall);
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

describe('Pinterest Tag', () => {
  beforeEach(() => {
    clearCookie();
    window.pintrk = undefined;
    window._pintrk = undefined;
    if (!window.crypto?.subtle) {
      try {
        Object.defineProperty(window, 'crypto', {
          value: globalThis.crypto,
          configurable: true,
        });
      } catch {
        // jsdom already exposes a working crypto.subtle
      }
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearCookie();
    window.pintrk = undefined;
    window._pintrk = undefined;
    document.querySelectorAll('script[src*="pinimg.com"]').forEach(el => el.remove());
  });

  it('maps page_view to page_visit once marketing consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', PINTEREST_PIXEL_ID);
    const calls = stubPintrk();
    grantMarketing();
    const getTrack = await renderProvider();

    act(() => { getTrack()({ event: 'page_view', page_type: 'homepage' }); });

    expect(pintrkEvents(calls).map(c => c[0])).toEqual(['page_visit']);
  });

  it('maps the ecommerce funnel onto Pinterest standard events', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', PINTEREST_PIXEL_ID);
    const calls = stubPintrk();
    grantMarketing();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'detail', product_id: 'p1', product_name: 'Desk Lamp', currency: 'GBP', value: 24.99 }); });
    act(() => { track({ event: 'add_to_cart', value: 24.99, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });
    act(() => { track({ event: 'begin_checkout', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });

    expect(pintrkEvents(calls).map(c => c[0])).toEqual(['view_content', 'add_to_cart', 'check_out', 'check_out']);
  });

  it('sends Pinterest content_ids on view_content and order_id on check_out', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', PINTEREST_PIXEL_ID);
    const calls = stubPintrk();
    grantMarketing();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'detail', product_id: 'p1', product_name: 'Desk Lamp', currency: 'GBP', value: 24.99 }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 49.98, currency: 'GBP', items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }] }); });

    const [view, purchase] = pintrkEvents(calls);
    expect(view[1]).toMatchObject({ content_ids: ['p1'], content_type: 'product', currency: 'GBP' });
    expect(purchase[1]).toMatchObject({ order_id: 'ORD-1', currency: 'GBP', value: 49.98 });
    expect(purchase[1]).not.toHaveProperty('em');
    expect((purchase[1] as { contents: unknown[] }).contents).toEqual([
      { id: 'p1', quantity: 2, item_price: 24.99 },
    ]);
  });

  it('passes SHA-256 hashed email as `em` on purchase for Enhanced Match', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', PINTEREST_PIXEL_ID);
    const calls = stubPintrk();
    grantMarketing();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => {
      track({
        event: 'purchase',
        transaction_id: 'ORD-1',
        value: 49.98,
        currency: 'GBP',
        items: [{ item_id: 'p1', item_name: 'Desk Lamp', price: 24.99, quantity: 2 }],
        email: '  Buyer@Example.COM  ',
      });
    });

    // Enhanced Match hashing is async; wait for it to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    const [purchase] = pintrkEvents(calls);
    expect(purchase[1]).toMatchObject({ order_id: 'ORD-1' });
    expect((purchase[1] as { em?: string }).em).toBe(await sha256Hex('buyer@example.com'));
  });

  it('does not load or fire the pixel when marketing consent is denied', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', PINTEREST_PIXEL_ID);
    const calls = stubPintrk();
    denyAll();
    const getTrack = await renderProvider();
    const track = getTrack();

    act(() => { track({ event: 'page_view', page_type: 'homepage' }); });
    act(() => { track({ event: 'purchase', transaction_id: 'ORD-1', value: 10, currency: 'GBP' }); });

    expect(calls).toHaveLength(0);
    expect(document.querySelector('script[src*="pinimg.com"]')).toBeNull();
  });

  it('fires no pixel events when NEXT_PUBLIC_PINTEREST_PIXEL_ID is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_PINTEREST_PIXEL_ID', '');
    const calls = stubPintrk();
    grantMarketing();
    const getTrack = await renderProvider();

    act(() => { getTrack()({ event: 'page_view', page_type: 'homepage' }); });

    expect(calls).toHaveLength(0);
  });
});
