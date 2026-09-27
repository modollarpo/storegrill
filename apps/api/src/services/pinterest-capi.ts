const AD_ACCOUNT_ID = process.env.PINTEREST_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const ENABLED = Boolean(AD_ACCOUNT_ID && ACCESS_TOKEN);

const API_BASE = 'https://api.pinterest.com/v5';

export interface PinterestCapiEvent {
  eventId: string;
  eventType: string;
  value?: number;
  currency?: string;
  searchTerm?: string;
  orderId?: string;
  items?: Array<{ id: string; name?: string; qty?: number; price?: number }>;
  sessionId?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

function toPinterestEventName(eventType: string): string | null {
  switch (eventType) {
    case 'page_view': return 'page_visit';
    case 'searchhit': return 'search';
    case 'detail':
    case 'view_item': return 'view_content';
    case 'add_to_cart': return 'add_to_cart';
    case 'begin_checkout':
    case 'purchase': return 'check_out';
    default: return null;
  }
}

function buildCustomData(input: PinterestCapiEvent): Record<string, unknown> {
  const custom: Record<string, unknown> = {};
  if (input.currency) custom.currency = input.currency;
  if (input.value != null) custom.value = input.value;
  if (input.searchTerm) custom.search_string = input.searchTerm;
  if (input.orderId) custom.order_id = input.orderId;

  if (input.items?.length) {
    custom.contents = input.items.map(i => ({
      id: i.id,
      quantity: i.qty ?? 1,
      item_price: i.price,
    }));
    custom.content_ids = input.items.map(i => i.id);
    custom.num_items = input.items.reduce((sum, i) => sum + (i.qty ?? 1), 0);
  }

  return custom;
}

export async function sendPinterestCapiEvent(input: PinterestCapiEvent): Promise<void> {
  if (!ENABLED) return;

  const eventName = toPinterestEventName(input.eventType);
  if (!eventName) return;

  const user_data: Record<string, unknown> = {};
  if (input.clientIp) user_data.client_ip_address = input.clientIp;
  if (input.clientUserAgent) user_data.client_user_agent = input.clientUserAgent;
  if (input.sessionId) user_data.external_id = [input.sessionId];

  const payload = {
    data: [{
      event_name: eventName,
      action_source: 'web',
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      user_data,
      custom_data: buildCustomData(input),
    }],
  };

  try {
    const res = await fetch(`${API_BASE}/ad_accounts/${AD_ACCOUNT_ID}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Pinterest CAPI failed: ${res.status} ${text}`);
    }
  } catch (err) {
    console.error('Pinterest CAPI error:', err instanceof Error ? err.message : err);
  }
}
