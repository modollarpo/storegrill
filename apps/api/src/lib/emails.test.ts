import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  formatPrice,
  formatAddress,
  renderOrderConfirmationHtml,
  renderOrderCancelledHtml,
  renderShipmentUpdateHtml,
  renderVendorAlertHtml,
} from './emails.js';
import { CarrierShipmentStatus } from '@Storegrill/shared';
import type { OrderEmailSnapshot, ShipmentUpdateEmailInput, VendorAlertEmailInput } from './emails.js';

const baseSnapshot: OrderEmailSnapshot = {
  orderNumber: 'SG-123-AB',
  customerName: 'Alice Smith',
  customerEmail: 'alice@test.com',
  currencyCode: 'GBP',
  items: [
    { name: 'Widget', quantity: 2, unitPriceMinorUnits: 1500, totalMinorUnits: 3000, image: 'https://img.storegrill.net/widget.jpg' },
    { name: 'Gadget', quantity: 1, unitPriceMinorUnits: 4999, totalMinorUnits: 4999, image: undefined },
  ],
  totals: {
    subtotalMinorUnits: 7999,
    shippingMinorUnits: 399,
    taxMinorUnits: 1600,
    discountMinorUnits: 0,
    totalMinorUnits: 9998,
  },
  shippingAddress: '{"name":"Alice","line1":"10 Downing St","city":"London","postcode":"SW1A 1AA","country":"GB"}',
  orderUrl: 'http://localhost:3000/account/orders/abc123',
};

describe('escapeHtml', () => {
  it('escapes ampersand, angle brackets, quotes, and single quotes', () => {
    expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;');
  });

  it('passes through clean strings unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('formatPrice', () => {
  it('formats GBP with two decimals', () => {
    expect(formatPrice(1500, 'GBP')).toBe('£15.00');
  });

  it('formats USD with two decimals', () => {
    expect(formatPrice(9999, 'USD')).toBe('$99.99');
  });

  it('formats zero-decimal currency (JPY)', () => {
    const result = formatPrice(1200, 'JPY');
    expect(result).toContain('¥');
    expect(result).toContain('1,200');
    expect(result).not.toContain('.');
  });
});

describe('formatAddress', () => {
  it('parses a valid JSON address object', () => {
    const result = formatAddress('{"name":"Alice","line1":"10 Downing St","city":"London","postcode":"SW1A 1AA","country":"GB"}');
    expect(result).toBe('Alice, 10 Downing St, London, SW1A 1AA, GB');
  });

  it('strips empty / undefined values', () => {
    const result = formatAddress('{"line1":"10 Downing St","line2":null,"city":"London","county":null,"postcode":"SW1A 1AA","country":"GB"}');
    expect(result).toBe('10 Downing St, London, SW1A 1AA, GB');
  });

  it('falls back for unparseable JSON', () => {
    expect(formatAddress('not-json')).toBe('Address on account');
  });

  it('falls back for empty object', () => {
    expect(formatAddress('{}')).toBe('Address on account');
  });
});

describe('renderOrderConfirmationHtml', () => {
  it('contains order number, customer name, totals, and tracking CTA', () => {
    const html = renderOrderConfirmationHtml(baseSnapshot);
    expect(html).toContain('SG-123-AB');
    expect(html).toContain('Alice Smith');
    expect(html).toContain('£99.98');
    expect(html).toContain('account/orders/abc123');
    expect(html).toContain('Track your order');
  });

  it('escapes user-supplied names against XSS', () => {
    const html = renderOrderConfirmationHtml({
      ...baseSnapshot,
      customerName: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows a discount line when discount is positive', () => {
    const html = renderOrderConfirmationHtml({
      ...baseSnapshot,
      totals: { ...baseSnapshot.totals, discountMinorUnits: 2000 },
    });
    expect(html).toContain('Discount');
    expect(html).toContain('&minus;');
  });

  it('omits the discount line when discount is zero', () => {
    const html = renderOrderConfirmationHtml(baseSnapshot);
    expect(html).not.toContain('Discount');
  });
});

describe('renderOrderCancelledHtml', () => {
  it('mentions cancellation and refund', () => {
    const html = renderOrderCancelledHtml(baseSnapshot);
    expect(html).toContain('cancelled');
    expect(html).toContain('refund');
    expect(html).toContain('SG-123-AB');
  });
});

describe('renderShipmentUpdateHtml', () => {
  const baseInput: ShipmentUpdateEmailInput = {
    customerName: 'Bob',
    orderNumber: 'SG-456-XY',
    status: CarrierShipmentStatus.SHIPPED,
    carrier: 'Royal Mail',
    trackingNumber: 'RM1234567890GB',
    location: 'London',
    orderUrl: 'http://localhost:3000/account/orders/xyz',
  };

  it('contains status, carrier, tracking number, and location', () => {
    const html = renderShipmentUpdateHtml(baseInput);
    expect(html).toContain('Bob');
    expect(html).toContain('SG-456-XY');
    expect(html).toContain('Royal Mail');
    expect(html).toContain('RM1234567890GB');
    expect(html).toContain('near London');
  });

  it('omits the location clause when not provided', () => {
    const html = renderShipmentUpdateHtml({ ...baseInput, location: null });
    expect(html).not.toContain(' near ');
  });

  it('omits tracking line when trackingNumber is null', () => {
    const html = renderShipmentUpdateHtml({ ...baseInput, trackingNumber: null });
    expect(html).not.toContain('Tracking');
    expect(html).toContain('Royal Mail');
  });
});

describe('renderVendorAlertHtml', () => {
  const vendorInput: VendorAlertEmailInput = {
    storeName: 'Best Electronics',
    orderNumber: 'SG-789-ZZ',
    orderUrl: 'http://localhost:3000/account/orders/abc123',
    currencyCode: 'GBP',
    items: [
      { name: 'Laptop', quantity: 1, unitPriceMinorUnits: 99999, totalMinorUnits: 99999, image: null },
    ],
    subtotalMinorUnits: 99999,
  };

  it('contains store name, order number, item details, and subtotal', () => {
    const html = renderVendorAlertHtml(vendorInput);
    expect(html).toContain('Best Electronics');
    expect(html).toContain('SG-789-ZZ');
    expect(html).toContain('Laptop');
    expect(html).toContain('£999.99');
  });

  it('escapes store name against XSS', () => {
    const html = renderVendorAlertHtml({
      ...vendorInput,
      storeName: '"><img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&quot;&gt;&lt;img');
  });
});
