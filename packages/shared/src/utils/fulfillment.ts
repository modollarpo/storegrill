import { RegionConfig } from '../models/region';
import { VendorProfile } from '../models/user';
import { vendorServesRegion } from '../models/vendor';

export interface CartLine {
  productId: string;
  vendorId: string;
  unitPriceMinorUnits: number;
  quantity: number;
}

export interface VendorFulfillment {
  vendorId: string;
  regionKey: string;
  lines: CartLine[];
  itemMinorUnits: number;
  dutyMinorUnits: number;
  shippingMinorUnits: number;
  landedMinorUnits: number;
}

export interface FulfillmentPlan {
  customerRegionKey: string;
  vendors: VendorFulfillment[];
  unfulfillable: CartLine[];
}

function dutyForRoute(
  vendor: VendorProfile,
  customerRegionKey: string,
  regionConfig: RegionConfig,
  itemMinorUnits: number,
): number {
  if (vendor.regionKey === customerRegionKey) return 0;
  const duty = regionConfig.taxRules.find(t => t.type === 'IMPORT_DUTY');
  if (!duty) return 0;
  return Math.round(itemMinorUnits * duty.rate);
}

function shippingForRegion(regionConfig: RegionConfig, itemMinorUnits: number): number {
  const zone = regionConfig.shippingZones[0];
  if (!zone) return 0;
  return zone.baseRateMinorUnits + (zone.perKgRateMinorUnits ?? 0) * 0;
}

export function planFulfillment(
  lines: CartLine[],
  vendors: VendorProfile[],
  customerRegionKey: string,
  regionConfig: RegionConfig,
): FulfillmentPlan {
  const result: VendorFulfillment[] = [];
  const unfulfillable: CartLine[] = [];

  for (const line of lines) {
    const owner = vendors.find(v => v.id === line.vendorId);
    const serving = vendors.filter(v => vendorServesRegion(v, customerRegionKey));
    const candidates = owner && vendorServesRegion(owner, customerRegionKey) ? [owner] : serving;
    if (candidates.length === 0) {
      unfulfillable.push(line);
      continue;
    }

    let best: VendorProfile | null = null;
    let bestCost = Infinity;
    for (const v of candidates) {
      const item = line.unitPriceMinorUnits * line.quantity;
      const cost = item + dutyForRoute(v, customerRegionKey, regionConfig, item) + shippingForRegion(regionConfig, item);
      if (cost < bestCost) {
        bestCost = cost;
        best = v;
      }
    }
    if (!best) {
      unfulfillable.push(line);
      continue;
    }

    const item = line.unitPriceMinorUnits * line.quantity;
    const duty = dutyForRoute(best, customerRegionKey, regionConfig, item);
    const ship = shippingForRegion(regionConfig, item);
    const existing = result.find(r => r.vendorId === best.id);
    if (existing) {
      existing.lines.push(line);
      existing.itemMinorUnits += item;
      existing.dutyMinorUnits += duty;
      existing.shippingMinorUnits += ship;
      existing.landedMinorUnits += item + duty + ship;
    } else {
      result.push({
        vendorId: best.id,
        regionKey: best.regionKey ?? customerRegionKey,
        lines: [line],
        itemMinorUnits: item,
        dutyMinorUnits: duty,
        shippingMinorUnits: ship,
        landedMinorUnits: item + duty + ship,
      });
    }
  }

  return { customerRegionKey, vendors: result, unfulfillable };
}
