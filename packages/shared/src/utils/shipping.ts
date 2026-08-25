import { Money, createMoney, addMoney } from './money';

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  baseRateMinorUnits: bigint;
  currencyCode: string;
  perKgRateMinorUnits?: bigint;
  freeShippingThresholdMinorUnits?: bigint;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  carriers: string[];
  enabled: boolean;
}

export interface ShippingCalculationInput {
  items: Array<{
    weightGrams?: number;
    quantity: number;
  }>;
  subtotal: Money;
  country: string;
  regionKey: string;
}

export interface ShippingOption {
  zoneId: string;
  carrier: string;
  costMinorUnits: bigint;
  currencyCode: string;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  freeShipping: boolean;
}

export function calculateShippingOptions(
  input: ShippingCalculationInput,
  zones: ShippingZone[],
): ShippingOption[] {
  const applicableZones = zones.filter(zone => {
    if (!zone.enabled) return false;
    return zone.countries.includes(input.country);
  });

  const options: ShippingOption[] = [];

  for (const zone of applicableZones) {
    const totalWeightGrams = input.items.reduce(
      (sum, item) => sum + (item.weightGrams || 500) * item.quantity,
      0,
    );

    const weightKg = totalWeightGrams / 1000;

    let cost = zone.baseRateMinorUnits;
    if (zone.perKgRateMinorUnits && weightKg > 0) {
      cost += BigInt(Math.ceil(weightKg * Number(zone.perKgRateMinorUnits)));
    }

    const isFree = zone.freeShippingThresholdMinorUnits !== undefined &&
      input.subtotal.amountMinorUnits >= zone.freeShippingThresholdMinorUnits;

    for (const carrier of zone.carriers) {
      options.push({
        zoneId: zone.id,
        carrier,
        costMinorUnits: isFree ? 0n : cost,
        currencyCode: zone.currencyCode,
        estimatedDaysMin: zone.estimatedDaysMin,
        estimatedDaysMax: zone.estimatedDaysMax,
        freeShipping: isFree,
      });
    }
  }

  return options;
}

export function selectCheapestOption(options: ShippingOption[]): ShippingOption | null {
  if (options.length === 0) return null;
  return options.reduce((cheapest, current) =>
    current.costMinorUnits < cheapest.costMinorUnits ? current : cheapest
  );
}

export function selectFastestOption(options: ShippingOption[]): ShippingOption | null {
  if (options.length === 0) return null;
  return options.reduce((fastest, current) => {
    const fastestMax = fastest.estimatedDaysMax || 999;
    const currentMax = current.estimatedDaysMax || 999;
    return currentMax < fastestMax ? current : fastest;
  });
}

export type VendorShippingMode = 'REGION' | 'FLAT';

export interface VendorShippingPolicy {
  vendorId: string;
  mode: VendorShippingMode;
  flatRateMinorUnits?: bigint;
}

export interface GroupedShippingItem {
  vendorId: string;
  weightGrams?: number;
  quantity: number;
}

export interface GroupedShippingInput {
  items: Array<GroupedShippingItem>;
  itemSubtotals: Record<string, bigint>;
  country: string;
  regionKey: string;
}

export interface GroupedShippingResult {
  totalMinorUnits: bigint;
  currencyCode: string;
  flatFeesMinorUnits: bigint;
  zoneShippingMinorUnits: bigint;
}

export function calculateGroupedShipping(
  input: GroupedShippingInput,
  policies: Record<string, VendorShippingPolicy>,
  zones: ShippingZone[],
): GroupedShippingResult | null {
  const flatVendorIds = new Set(
    Object.values(policies)
      .filter(p => p.mode === 'FLAT' && p.flatRateMinorUnits !== undefined)
      .map(p => p.vendorId),
  );

  const chargedVendorIds = new Set(input.items.map(i => i.vendorId));
  let flatFees = 0n;
  for (const vendorId of chargedVendorIds) {
    if (flatVendorIds.has(vendorId)) {
      flatFees += policies[vendorId].flatRateMinorUnits!;
    }
  }

  const zoneItems = input.items.filter(item => !flatVendorIds.has(item.vendorId));
  let zoneShipping = 0n;
  let currencyCode: string | undefined;

  if (zoneItems.length > 0) {
    const zoneSubtotal = Object.entries(input.itemSubtotals)
      .filter(([vendorId]) => !flatVendorIds.has(vendorId))
      .reduce((sum, [, value]) => sum + value, 0n);

    const options = calculateShippingOptions(
      {
        items: zoneItems,
        subtotal: createMoney(zoneSubtotal, 'XXX'),
        country: input.country,
        regionKey: input.regionKey,
      },
      zones,
    );
    const cheapest = selectCheapestOption(options);
    if (cheapest) {
      zoneShipping = cheapest.costMinorUnits;
      currencyCode = cheapest.currencyCode;
    }
  }

  if (currencyCode === undefined) {
    const anyZone = zones.find(z => z.enabled);
    currencyCode = anyZone?.currencyCode;
  }

  if (flatFees === 0n && zoneShipping === 0n) {
    return null;
  }

  return {
    totalMinorUnits: flatFees + zoneShipping,
    currencyCode: currencyCode ?? 'GBP',
    flatFeesMinorUnits: flatFees,
    zoneShippingMinorUnits: zoneShipping,
  };
}
