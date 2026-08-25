import { describe, it, expect } from 'vitest';
import { calculateShippingOptions, selectCheapestOption, selectFastestOption, calculateGroupedShipping, ShippingZone } from './shipping';
import { createMoney } from './money';

const usZones: ShippingZone[] = [
  {
    id: 'us-standard',
    name: 'US Standard',
    countries: ['US'],
    baseRateMinorUnits: 599n,
    currencyCode: 'USD',
    perKgRateMinorUnits: 100n,
    freeShippingThresholdMinorUnits: 3500n,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    carriers: ['USPS', 'UPS'],
    enabled: true,
  },
  {
    id: 'us-express',
    name: 'US Express',
    countries: ['US'],
    baseRateMinorUnits: 1299n,
    currencyCode: 'USD',
    estimatedDaysMin: 1,
    estimatedDaysMax: 2,
    carriers: ['FedEx'],
    enabled: true,
  },
  {
    id: 'eu-standard',
    name: 'EU Standard',
    countries: ['DE', 'FR', 'IT'],
    baseRateMinorUnits: 899n,
    currencyCode: 'EUR',
    estimatedDaysMin: 5,
    estimatedDaysMax: 10,
    carriers: ['DHL'],
    enabled: true,
  },
  {
    id: 'disabled-zone',
    name: 'Disabled',
    countries: ['XX'],
    baseRateMinorUnits: 999n,
    currencyCode: 'USD',
    carriers: ['X'],
    enabled: false,
  },
];

describe('calculateShippingOptions', () => {
  it('returns options for matching country', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    expect(options.length).toBeGreaterThan(0);
    expect(options.every(o => o.carrier)).toBe(true);
  });

  it('excludes disabled zones', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'XX',
        regionKey: 'XX',
      },
      usZones,
    );
    expect(options).toHaveLength(0);
  });

  it('returns empty for non-matching country', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'JP',
        regionKey: 'JP',
      },
      usZones,
    );
    expect(options).toHaveLength(0);
  });

  it('applies free shipping when threshold met', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(5000n, 'USD'), // above 3500 threshold
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const uspsOption = options.find(o => o.carrier === 'USPS');
    expect(uspsOption?.freeShipping).toBe(true);
    expect(uspsOption?.costMinorUnits).toBe(0n);
  });

  it('charges shipping below threshold', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'), // below 3500 threshold
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const uspsOption = options.find(o => o.carrier === 'USPS');
    expect(uspsOption?.freeShipping).toBe(false);
    expect(uspsOption?.costMinorUnits).toBeGreaterThan(0n);
  });

  it('calculates weight-based cost', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 2000, quantity: 1 }], // 2kg
        subtotal: createMoney(1000n, 'USD'),
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const uspsOption = options.find(o => o.carrier === 'USPS');
    expect(uspsOption?.costMinorUnits).toBeGreaterThan(599n); // base + weight
  });

  it('creates separate option per carrier', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const carriers = options.map(o => o.carrier);
    expect(carriers).toContain('USPS');
    expect(carriers).toContain('UPS');
    expect(carriers).toContain('FedEx');
  });
});

describe('selectCheapestOption', () => {
  it('returns the cheapest option', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const cheapest = selectCheapestOption(options);
    expect(cheapest).not.toBeNull();
    expect(cheapest!.carrier).toBe('USPS'); // base 599 vs 1299
  });

  it('returns null for empty array', () => {
    expect(selectCheapestOption([])).toBeNull();
  });
});

describe('selectFastestOption', () => {
  it('returns the fastest option', () => {
    const options = calculateShippingOptions(
      {
        items: [{ weightGrams: 500, quantity: 1 }],
        subtotal: createMoney(1000n, 'USD'),
        country: 'US',
        regionKey: 'US',
      },
      usZones,
    );
    const fastest = selectFastestOption(options);
    expect(fastest).not.toBeNull();
    expect(fastest!.carrier).toBe('FedEx'); // 1-2 days vs 3-7
  });

  it('returns null for empty array', () => {
    expect(selectFastestOption([])).toBeNull();
  });
});

const ukZones: ShippingZone[] = [
  {
    id: 'uk-standard',
    name: 'UK Standard',
    countries: ['GB'],
    baseRateMinorUnits: 399n,
    currencyCode: 'GBP',
    perKgRateMinorUnits: 99n,
    freeShippingThresholdMinorUnits: 3500n,
    carriers: ['Royal Mail', 'Evri', 'DHL'],
    enabled: true,
  },
];

describe('calculateGroupedShipping', () => {
  const housePolicy = { vendorId: 'house', mode: 'FLAT' as const, flatRateMinorUnits: 1000n };

  it('charges the flat fee for a cart of only house-vendor items', () => {
    const result = calculateGroupedShipping(
      {
        items: [{ vendorId: 'house', weightGrams: 500, quantity: 3 }],
        itemSubtotals: { house: 30000n },
        country: 'GB',
        regionKey: 'UK',
      },
      { house: housePolicy },
      ukZones,
    );
    expect(result).not.toBeNull();
    expect(result!.totalMinorUnits).toBe(1000n);
    expect(result!.flatFeesMinorUnits).toBe(1000n);
    expect(result!.zoneShippingMinorUnits).toBe(0n);
    expect(result!.currencyCode).toBe('GBP');
  });

  it('charges the flat fee once per vendor regardless of item count', () => {
    const result = calculateGroupedShipping(
      {
        items: [
          { vendorId: 'house', weightGrams: 500, quantity: 1 },
          { vendorId: 'house', weightGrams: 500, quantity: 2 },
        ],
        itemSubtotals: { house: 50000n },
        country: 'GB',
        regionKey: 'UK',
      },
      { house: housePolicy },
      ukZones,
    );
    expect(result!.flatFeesMinorUnits).toBe(1000n);
  });

  it('uses zone rates for region-mode vendors only', () => {
    const result = calculateGroupedShipping(
      {
        items: [{ vendorId: 'market', weightGrams: 500, quantity: 1 }],
        itemSubtotals: { market: 2000n },
        country: 'GB',
        regionKey: 'UK',
      },
      { market: { vendorId: 'market', mode: 'REGION' } },
      ukZones,
    );
    expect(result!.zoneShippingMinorUnits).toBeGreaterThan(0n);
    expect(result!.flatFeesMinorUnits).toBe(0n);
  });

  it('sums flat fee plus zone cost for mixed carts', () => {
    const result = calculateGroupedShipping(
      {
        items: [
          { vendorId: 'house', weightGrams: 500, quantity: 1 },
          { vendorId: 'market', weightGrams: 500, quantity: 1 },
        ],
        itemSubtotals: { house: 11599n, market: 2000n },
        country: 'GB',
        regionKey: 'UK',
      },
      {
        house: housePolicy,
        market: { vendorId: 'market', mode: 'REGION' },
      },
      ukZones,
    );
    expect(result!.flatFeesMinorUnits).toBe(1000n);
    expect(result!.zoneShippingMinorUnits).toBe(449n); // base 399 + ceil(0.5kg * 99) = 50
    expect(result!.totalMinorUnits).toBe(1000n + 449n);
  });

  it('keeps charging flat fee even when zone subtotal would qualify for free shipping', () => {
    const result = calculateGroupedShipping(
      {
        items: [
          { vendorId: 'house', weightGrams: 500, quantity: 1 },
          { vendorId: 'market', weightGrams: 500, quantity: 10 },
        ],
        itemSubtotals: { house: 11599n, market: 50000n },
        country: 'GB',
        regionKey: 'UK',
      },
      {
        house: housePolicy,
        market: { vendorId: 'market', mode: 'REGION' },
      },
      ukZones,
    );
    expect(result!.zoneShippingMinorUnits).toBe(0n); // market subtotal above threshold
    expect(result!.flatFeesMinorUnits).toBe(1000n);
    expect(result!.totalMinorUnits).toBe(1000n);
  });

  it('returns null when no shipping applies at all', () => {
    const result = calculateGroupedShipping(
      {
        items: [],
        itemSubtotals: {},
        country: 'GB',
        regionKey: 'UK',
      },
      {},
      ukZones,
    );
    expect(result).toBeNull();
  });
});
