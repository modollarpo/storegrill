import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const AD_ACCOUNT_ID = '549765436316';
const ACCESS_TOKEN = 'pina_test_token';

async function loadSender() {
  vi.resetModules();
  vi.stubEnv('PINTEREST_AD_ACCOUNT_ID', AD_ACCOUNT_ID);
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', ACCESS_TOKEN);
  const mod = await import('./pinterest-capi.js');
  return mod.sendPinterestCapiEvent as (input: Record<string, unknown>) => Promise<void>;
}

function mockFetch() {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
}

describe('sendPinterestCapiEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('posts a page_visit event to the Pinterest CAPI endpoint', async () => {
    const send = await loadSender();
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    await send({
      eventId: 'evt-1',
      eventType: 'page_view',
      sessionId: 'sess-1',
      clientIp: '203.0.113.10',
      clientUserAgent: 'Mozilla/5.0',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.pinterest.com/v5/ad_accounts/${AD_ACCOUNT_ID}/events`);
    expect(init?.method).toBe('POST');

    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);

    const body = JSON.parse(init?.body as string);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      event_name: 'page_visit',
      action_source: 'web',
      event_id: 'evt-1',
    });
    expect(body.data[0].user_data).toEqual({
      client_ip_address: '203.0.113.10',
      client_user_agent: 'Mozilla/5.0',
      external_id: ['sess-1'],
    });
  });

  it('maps the full event funnel onto Pinterest standard event names', async () => {
    const send = await loadSender();
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    const cases: Array<[string, string]> = [
      ['page_view', 'page_visit'],
      ['searchhit', 'search'],
      ['detail', 'view_content'],
      ['view_item', 'view_content'],
      ['add_to_cart', 'add_to_cart'],
      ['begin_checkout', 'check_out'],
      ['purchase', 'check_out'],
    ];

    for (const [internal] of cases) {
      await send({ eventId: `evt-${internal}`, eventType: internal });
    }

    expect(fetchMock).toHaveBeenCalledTimes(cases.length);
    cases.forEach(([, pinterest], i) => {
      const body = JSON.parse(fetchMock.mock.calls[i][1]?.body as string);
      expect(body.data[0].event_name).toBe(pinterest);
    });
  });

  it('sends purchase custom_data with contents, value, currency and order_id', async () => {
    const send = await loadSender();
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    await send({
      eventId: 'evt-purchase',
      eventType: 'purchase',
      value: 49.98,
      currency: 'GBP',
      orderId: 'ORD-1',
      items: [
        { id: 'p1', name: 'Desk Lamp', qty: 2, price: 24.99 },
        { id: 'p2', name: 'Bulb', qty: 1, price: 5.0 },
      ],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data[0].custom_data).toEqual({
      currency: 'GBP',
      value: 49.98,
      order_id: 'ORD-1',
      contents: [
        { id: 'p1', quantity: 2, item_price: 24.99 },
        { id: 'p2', quantity: 1, item_price: 5.0 },
      ],
      content_ids: ['p1', 'p2'],
      num_items: 3,
    });
  });

  it('includes search_string on search events', async () => {
    const send = await loadSender();
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    await send({
      eventId: 'evt-search',
      eventType: 'searchhit',
      searchTerm: 'desk lamp',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data[0].custom_data).toMatchObject({ search_string: 'desk lamp' });
  });

  it('silently ignores unsupported event types', async () => {
    const send = await loadSender();
    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    await send({ eventId: 'evt-x', eventType: 'some_custom_thing' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when CAPI is not configured', async () => {
    vi.resetModules();
    vi.stubEnv('PINTEREST_AD_ACCOUNT_ID', '');
    vi.stubEnv('PINTEREST_ACCESS_TOKEN', '');
    const mod = await import('./pinterest-capi.js');

    const fetchMock = mockFetch();
    vi.stubGlobal('fetch', fetchMock);

    await mod.sendPinterestCapiEvent({ eventId: 'evt-1', eventType: 'page_view' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows network errors so analytics never breaks checkout', async () => {
    const send = await loadSender();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    await expect(
      send({ eventId: 'evt-1', eventType: 'purchase', value: 10 }),
    ).resolves.toBeUndefined();
  });

  it('logs and swallows non-2xx responses', async () => {
    const send = await loadSender();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 403 })));

    await expect(
      send({ eventId: 'evt-1', eventType: 'page_view' }),
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('403'));
    errSpy.mockRestore();
  });
});
