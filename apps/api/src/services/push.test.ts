import { describe, it, expect } from 'vitest';
import { payloadToJson, PushPayload } from './push-format.js';

describe('push payload serialization', () => {
  it('emits top-level url and nested data as extra for the service worker', () => {
    const payload: PushPayload = {
      title: 'Flash deal live',
      body: '50% off grills in your region',
      url: 'https://uk.Storegrill.net/deals/grill-fest',
      icon: '/icon-192.png',
      data: { dealId: 'DEAL-1', region: 'UK' },
    };

    const json = payloadToJson(payload);
    const parsed = JSON.parse(json);

    expect(parsed.title).toBe('Flash deal live');
    expect(parsed.body).toBe('50% off grills in your region');
    expect(parsed.url).toBe('https://uk.Storegrill.net/deals/grill-fest');
    expect(parsed.icon).toBe('/icon-192.png');
    expect(parsed.extra).toEqual({ dealId: 'DEAL-1', region: 'UK' });
    expect(parsed.data).toBeUndefined();
  });

  it('omits undefined fields', () => {
    const parsed = JSON.parse(payloadToJson({ title: 'Only title' }));
    expect(parsed.url).toBeUndefined();
    expect(parsed.extra).toBeUndefined();
    expect(parsed.body).toBeUndefined();
  });
});