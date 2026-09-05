import { describe, it, expect } from 'vitest';
import {
  aggregateFulfilmentState,
  canonicalCarrierStatus,
  CarrierShipmentStatus,
  deriveShipmentStatus,
  isOrderDelivered,
  isTerminalShipmentStatus,
  normalizeCarrierProvider,
  orderHasShipped,
  reduceShipmentStatus,
} from './carrier.js';

const ev = (status: string, at: string) => ({ status, location: null, description: null, at });

describe('carrier provider normalization', () => {
  it('maps common carrier names to canonical providers', () => {
    expect(normalizeCarrierProvider('Royal Mail')).toBe('ROYAL_MAIL');
    expect(normalizeCarrierProvider('HERMES')).toBe('EVRI');
    expect(normalizeCarrierProvider('DHL Express')).toBe('REGIONAL');
    expect(normalizeCarrierProvider(null)).toBe('REGIONAL');
  });
});

describe('carrier code tables', () => {
  it('maps Royal Mail progress codes to canonical statuses', () => {
    expect(canonicalCarrierStatus('ROYAL_MAIL', 'IN_TRANSIT')).toBe(CarrierShipmentStatus.IN_TRANSIT);
    expect(canonicalCarrierStatus('royal mail', 'OUT FOR DELIVERY')).toBe(CarrierShipmentStatus.OUT_FOR_DELIVERY);
    expect(canonicalCarrierStatus('ROYAL_MAIL', 'Delivered')).toBe(CarrierShipmentStatus.DELIVERED);
  });

  it('falls back sensibly for unknown and empty codes', () => {
    expect(canonicalCarrierStatus('ROYAL_MAIL', 'SORTED AT HUB')).toBe(CarrierShipmentStatus.IN_TRANSIT);
    expect(canonicalCarrierStatus('ROYAL_MAIL', '')).toBe(CarrierShipmentStatus.PENDING);
    expect(canonicalCarrierStatus('ROYAL_MAIL', 'DELIVERY EXCEPTION EN ROUTE')).toBe(CarrierShipmentStatus.EXCEPTION);
  });
});

describe('shipment status reducer', () => {
  it('progresses along the happy path and never regresses a delivery', () => {
    const stream = [
      ev(CarrierShipmentStatus.SHIPPED, 't1'),
      ev(CarrierShipmentStatus.IN_TRANSIT, 't2'),
      ev(CarrierShipmentStatus.OUT_FOR_DELIVERY, 't3'),
      ev(CarrierShipmentStatus.DELIVERED, 't4'),
      ev(CarrierShipmentStatus.IN_TRANSIT, 't5'),
    ];
    const finalState = deriveShipmentStatus(stream);
    expect(finalState).toBe(CarrierShipmentStatus.DELIVERED);
  });

  it('branches through ATTEMPTED/EXCEPTION without locking the parcel', () => {
    const attempted = reduceShipmentStatus(CarrierShipmentStatus.IN_TRANSIT, ev(CarrierShipmentStatus.ATTEMPTED, 't1'));
    expect(attempted).toBe(CarrierShipmentStatus.ATTEMPTED);
    const recovered = reduceShipmentStatus(attempted, ev(CarrierShipmentStatus.OUT_FOR_DELIVERY, 't2'));
    expect(recovered).toBe(CarrierShipmentStatus.OUT_FOR_DELIVERY);
  });

  it('treats a returned parcel as terminal', () => {
    expect(isTerminalShipmentStatus(CarrierShipmentStatus.RETURNED)).toBe(true);
    const after = reduceShipmentStatus(CarrierShipmentStatus.SHIPPED, ev(CarrierShipmentStatus.RETURNED, 't1'));
    expect(after).toBe(CarrierShipmentStatus.RETURNED);
    expect(reduceShipmentStatus(after, ev(CarrierShipmentStatus.IN_TRANSIT, 't2'))).toBe(CarrierShipmentStatus.RETURNED);
  });
});

describe('order fulfilment gating', () => {
  const vendor = (vendorId: string, status: string) => ({ vendorId, status: status as any });

  it('is delivered only when every expected vendor has all parcels delivered', () => {
    const rows = [
      vendor('v1', CarrierShipmentStatus.DELIVERED),
      vendor('v1', CarrierShipmentStatus.DELIVERED),
      vendor('v2', CarrierShipmentStatus.DELIVERED),
    ];
    expect(isOrderDelivered(rows, ['v1', 'v2'])).toBe(true);
  });

  it('is not delivered while a vendor or parcel is still in transit', () => {
    const rows = [
      vendor('v1', CarrierShipmentStatus.DELIVERED),
      vendor('v2', CarrierShipmentStatus.IN_TRANSIT),
    ];
    expect(isOrderDelivered(rows, ['v1', 'v2'])).toBe(false);
  });

  it('is delivered for a legacy single shipment covering the whole order', () => {
    const rows = [vendor(null, CarrierShipmentStatus.DELIVERED)];
    expect(isOrderDelivered(rows)).toBe(true);
    expect(isOrderDelivered(rows, ['v1', 'v2'])).toBe(true);
  });

  it('legacy rows must all be delivered too', () => {
    const rows = [vendor(null, CarrierShipmentStatus.DELIVERED), vendor(null, CarrierShipmentStatus.IN_TRANSIT)];
    expect(isOrderDelivered(rows)).toBe(false);
  });

  it('an order with no shipment rows is never delivered or shipped', () => {
    expect(isOrderDelivered([])).toBe(false);
    expect(orderHasShipped([])).toBe(false);
  });

  it('aggregates facing delivery state', () => {
    expect(aggregateFulfilmentState([])).toBe('UNSHIPPED');
    expect(
      aggregateFulfilmentState([vendor('v1', CarrierShipmentStatus.DELIVERED), vendor('v2', CarrierShipmentStatus.PENDING)]),
    ).toBe('PARTIALLY_SHIPPED');
    expect(aggregateFulfilmentState([vendor('v1', CarrierShipmentStatus.IN_TRANSIT)])).toBe('SHIPPED');
    expect(aggregateFulfilmentState([vendor('v1', CarrierShipmentStatus.EXCEPTION)])).toBe('EXCEPTION');
    expect(aggregateFulfilmentState([vendor('v1', CarrierShipmentStatus.PROCESSING)])).toBe('PENDING');
  });
});