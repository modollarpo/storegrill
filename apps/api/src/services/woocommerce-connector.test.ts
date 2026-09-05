import { describe, it, expect } from 'vitest';
import { WooCommerceConnector } from './woocommerce-connector.js';

describe('WooCommerceConnector', () => {
  it('instantiates with correct configuration', () => {
    const connector = new WooCommerceConnector('https://example.com', 'ck_test', 'cs_test');
    expect(connector.name).toBe('WooCommerce');
  });
});
