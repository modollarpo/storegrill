export const CarrierProvider = {
  ROYAL_MAIL: 'ROYAL_MAIL',
  EVRI: 'EVRI',
  DHL: 'DHL',
  UPS: 'UPS',
  FEDEX: 'FEDEX',
  USPS: 'USPS',
  DPD: 'DPD',
  REGIONAL: 'REGIONAL',
} as const;

export type CarrierProviderValue = (typeof CarrierProvider)[keyof typeof CarrierProvider];

export const CARRIER_PROVIDER_VALUES: readonly CarrierProviderValue[] = Object.values(CarrierProvider);

const CARRIER_ALIASES: Record<string, CarrierProviderValue> = {
  'royal mail': CarrierProvider.ROYAL_MAIL,
  'royalmail': CarrierProvider.ROYAL_MAIL,
  rm: CarrierProvider.ROYAL_MAIL,
  evri: CarrierProvider.EVRI,
  hermes: CarrierProvider.EVRI,
  'my hermes': CarrierProvider.EVRI,
  dhl: CarrierProvider.DHL,
  ups: CarrierProvider.UPS,
  fedex: CarrierProvider.FEDEX,
  usps: CarrierProvider.USPS,
  dpd: CarrierProvider.DPD,
  regional: CarrierProvider.REGIONAL,
  'regional carrier': CarrierProvider.REGIONAL,
};

export function normalizeCarrierProvider(input: string | null | undefined): CarrierProviderValue {
  const key = (input ?? '').trim().toLowerCase();
  return CARRIER_ALIASES[key] ?? CarrierProvider.REGIONAL;
}

export const CarrierShipmentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  ATTEMPTED: 'ATTEMPTED',
  EXCEPTION: 'EXCEPTION',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
} as const;

export type CarrierShipmentStatusValue = (typeof CarrierShipmentStatus)[keyof typeof CarrierShipmentStatus];

export const CARRIER_SHIPMENT_STATUS_VALUES: readonly CarrierShipmentStatusValue[] = Object.values(CarrierShipmentStatus);

const STATUS_RANK: Record<CarrierShipmentStatusValue, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  IN_TRANSIT: 3,
  EXCEPTION: 3,
  ATTEMPTED: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  RETURNED: 6,
  CANCELLED: 6,
  FAILED: 6,
};

const TERMINAL_STATUSES: ReadonlySet<CarrierShipmentStatusValue> = new Set([
  CarrierShipmentStatus.DELIVERED,
  CarrierShipmentStatus.RETURNED,
  CarrierShipmentStatus.CANCELLED,
  CarrierShipmentStatus.FAILED,
]);

export function isTerminalShipmentStatus(status: CarrierShipmentStatusValue): boolean {
  return TERMINAL_STATUSES.has(status);
}

export interface CarrierTrackingEvent {
  status: CarrierShipmentStatusValue;
  location: string | null;
  description: string | null;
  at: string;
}

const CARRIER_CODE_TABLES: Record<CarrierProviderValue, Record<string, CarrierShipmentStatusValue>> = {
  ROYAL_MAIL: {
    ACCEPTED: CarrierShipmentStatus.SHIPPED,
    'ACCEPTED AT DEPOT': CarrierShipmentStatus.SHIPPED,
    IN_TRANSIT: CarrierShipmentStatus.IN_TRANSIT,
    'ON ITS WAY': CarrierShipmentStatus.IN_TRANSIT,
    'LONG DELAYS': CarrierShipmentStatus.EXCEPTION,
    'READY FOR DELIVERY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    'OUT FOR DELIVERY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    'DELIVERY ATTEMPTED': CarrierShipmentStatus.ATTEMPTED,
    'RETURNED TO SENDER': CarrierShipmentStatus.RETURNED,
    CANCELLED: CarrierShipmentStatus.CANCELLED,
  },
  EVRI: {
    'WEVE GOT IT': CarrierShipmentStatus.SHIPPED,
    'WITH YOUR NEIGHBOUR': CarrierShipmentStatus.DELIVERED,
    'ON ITS WAY': CarrierShipmentStatus.IN_TRANSIT,
    'ON THE WAY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    'EVRI CARD LEFT': CarrierShipmentStatus.ATTEMPTED,
    'RETURNING TO SENDER': CarrierShipmentStatus.RETURNED,
    'IN A DELIVERY DEPOT': CarrierShipmentStatus.OUT_FOR_DELIVERY,
  },
  DHL: {
    'STATUS PICKED UP': CarrierShipmentStatus.SHIPPED,
    'STATUS IN TRANSIT': CarrierShipmentStatus.IN_TRANSIT,
    'STATUS IN DELIVERY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    'STATUS ATTEMPTED DELIVERY': CarrierShipmentStatus.ATTEMPTED,
    'STATUS EXCEPTION': CarrierShipmentStatus.EXCEPTION,
  },
  UPS: {
    ORIGIN_SCAN: CarrierShipmentStatus.SHIPPED,
    DEPARTURE_SCAN: CarrierShipmentStatus.IN_TRANSIT,
    ARRIVAL_SCAN: CarrierShipmentStatus.IN_TRANSIT,
    OUT_FOR_DELIVERY: CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    DELIVERY_EXCEPTION: CarrierShipmentStatus.EXCEPTION,
    RETURN_TO_SENDER: CarrierShipmentStatus.RETURNED,
  },
  FEDEX: {
    'PICKUP READY': CarrierShipmentStatus.PROCESSING,
    PICKED_UP: CarrierShipmentStatus.SHIPPED,
    IN_TRANSIT: CarrierShipmentStatus.IN_TRANSIT,
    DELAYED: CarrierShipmentStatus.EXCEPTION,
    'ON FEDEX VEHICLE FOR DELIVERY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    EXCEPTION: CarrierShipmentStatus.EXCEPTION,
  },
  USPS: {
    ACCEPTED: CarrierShipmentStatus.SHIPPED,
    'DEPARTED USPS REGIONAL FACILITY': CarrierShipmentStatus.IN_TRANSIT,
    IN_TRANSIT: CarrierShipmentStatus.IN_TRANSIT,
    'OUT FOR DELIVERY': CarrierShipmentStatus.OUT_FOR_DELIVERY,
    DELIVERED: CarrierShipmentStatus.DELIVERED,
    'DELIVERY ATTEMPTED': CarrierShipmentStatus.ATTEMPTED,
    'RETURN TO SENDER': CarrierShipmentStatus.RETURNED,
    FAILED: CarrierShipmentStatus.FAILED,
  },
  DPD: {
    'WITH DPD': CarrierShipmentStatus.SHIPPED,
    'ON THE WAY': CarrierShipmentStatus.IN_TRANSIT,
    'DELIVERED TO RECIPIENT': CarrierShipmentStatus.DELIVERED,
    'DELIVERED TO NEIGHBOUR': CarrierShipmentStatus.DELIVERED,
    'DELIVERY ATTEMPTED': CarrierShipmentStatus.ATTEMPTED,
    'RETURNED TO SENDER': CarrierShipmentStatus.RETURNED,
  },
  REGIONAL: {},
};

/**
 * Maps a carrier-provided tracking code to a canonical platform status.
 * Unknown codes fall back to IN_TRANSIT once a parcel is in the carrier's hands,
 * because any non-empty scan implies movement.
 */
export function canonicalCarrierStatus(provider: CarrierProviderValue | string, rawCode: string | null | undefined): CarrierShipmentStatusValue {
  const code = (rawCode ?? '').trim().toUpperCase();
  if (!code) {
    return CarrierShipmentStatus.PENDING;
  }
  const providerKey = normalizeCarrierProvider(provider);
  const table = CARRIER_CODE_TABLES[providerKey] ?? {};
  const direct = table[code] ?? table[code.replace(/\s+/, ' ')];
  if (direct) {
    return direct;
  }
  if (code.startsWith('DELIVERED')) {
    return CarrierShipmentStatus.DELIVERED;
  }
  if (code.includes('EXCEPTION') || code.includes('FAILED')) {
    return CarrierShipmentStatus.EXCEPTION;
  }
  if (code.includes('RETURN')) {
    return CarrierShipmentStatus.RETURNED;
  }
  return CarrierShipmentStatus.IN_TRANSIT;
}

export function toCanonicalShipmentStatus(status: string | null | undefined): CarrierShipmentStatusValue {
  const candidate = (status ?? '').trim().toUpperCase() as CarrierShipmentStatusValue;
  return CARRIER_SHIPMENT_STATUS_VALUES.includes(candidate) ? candidate : CarrierShipmentStatus.PENDING;
}

/**
 * Reducer over a (assumed chronological) stream of tracking events. Progress
 * follows STATUS_RANK; a terminal state (DELIVERED / RETURNED / CANCELLED /
 * FAILED) is never regressed, and ATTEMPTED/EXCEPTION branch states keep the
 * parcel moving forward rather than locking it.
 */
export function reduceShipmentStatus(
  current: CarrierShipmentStatusValue,
  event: CarrierTrackingEvent,
): CarrierShipmentStatusValue {
  if (event.status === current) {
    return current;
  }
  if (isTerminalShipmentStatus(current)) {
    return current;
  }
  if (isTerminalShipmentStatus(event.status)) {
    return event.status;
  }
  const currentRank = STATUS_RANK[current] ?? 0;
  const eventRank = STATUS_RANK[event.status] ?? 0;
  return eventRank > currentRank ? event.status : current;
}

export function deriveShipmentStatus(
  events: readonly CarrierTrackingEvent[],
  initial: CarrierShipmentStatusValue = CarrierShipmentStatus.PENDING,
): CarrierShipmentStatusValue {
  return events.reduce(reduceShipmentStatus, toCanonicalShipmentStatus(initial));
}

export function isActivityProgressStatus(status: CarrierShipmentStatusValue): boolean {
  return (
    status === CarrierShipmentStatus.SHIPPED ||
    status === CarrierShipmentStatus.IN_TRANSIT ||
    status === CarrierShipmentStatus.OUT_FOR_DELIVERY ||
    status === CarrierShipmentStatus.DELIVERED
  );
}

export interface ShipmentStatusRow {
  vendorId: string | null;
  status: CarrierShipmentStatusValue;
}

export type OrderFulfilmentStatusValue =
  | 'UNSHIPPED'
  | 'PENDING'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'EXCEPTION';

/**
 * True when every vendor on the order has every one of their parcels delivered.
 * Legacy rows (vendorId null) count for the whole order and must all be
 * delivered too; an order with no shipment rows is never delivered.
 */
export function isOrderDelivered(
  rows: readonly ShipmentStatusRow[],
  expectedVendorIds: readonly string[] = [],
): boolean {
  if (rows.length === 0) {
    return false;
  }
  const vendorRows = new Map<string, ShipmentStatusRow[]>();
  const legacyRows: ShipmentStatusRow[] = [];
  for (const row of rows) {
    if (row.vendorId) {
      const list = vendorRows.get(row.vendorId) ?? [];
      list.push(row);
      vendorRows.set(row.vendorId, list);
    } else {
      legacyRows.push(row);
    }
  }

  if (legacyRows.length > 0) {
    return legacyRows.every(row => row.status === CarrierShipmentStatus.DELIVERED);
  }

  const vendors = expectedVendorIds.length > 0 ? expectedVendorIds : [...vendorRows.keys()];
  for (const vendorId of vendors) {
    const list = vendorRows.get(vendorId);
    if (!list || list.length === 0 || !list.every(row => row.status === CarrierShipmentStatus.DELIVERED)) {
      return false;
    }
  }
  return true;
}

/** True when at least one parcel is moving toward the customer. */
export function orderHasShipped(rows: readonly ShipmentStatusRow[]): boolean {
  return rows.some(row => isActivityProgressStatus(row.status) || row.status === CarrierShipmentStatus.OUT_FOR_DELIVERY);
}

/**
 * Groups the delivery state of every vendor's parcels into one facing status
 * for order-level UI.
 */
export function aggregateFulfilmentState(rows: readonly ShipmentStatusRow[]): OrderFulfilmentStatusValue {
  if (rows.length === 0) {
    return 'UNSHIPPED';
  }
  if (isOrderDelivered(rows)) {
    return 'DELIVERED';
  }
  const hasMovement = rows.some(row =>
    isActivityProgressStatus(row.status) || row.status === CarrierShipmentStatus.OUT_FOR_DELIVERY,
  );
  if (hasMovement && rows.some(row => row.status === CarrierShipmentStatus.PENDING || row.status === CarrierShipmentStatus.PROCESSING)) {
    return 'PARTIALLY_SHIPPED';
  }
  if (hasMovement) {
    return 'SHIPPED';
  }
  if (rows.some(row => row.status === CarrierShipmentStatus.EXCEPTION || row.status === CarrierShipmentStatus.FAILED || row.status === CarrierShipmentStatus.RETURNED)) {
    return 'EXCEPTION';
  }
  return 'PENDING';
}

export function carrierDisplayName(provider: CarrierProviderValue | string): string {
  const key = normalizeCarrierProvider(provider);
  switch (key) {
    case CarrierProvider.ROYAL_MAIL:
      return 'Royal Mail';
    case CarrierProvider.EVRI:
      return 'Evri';
    case CarrierProvider.DHL:
      return 'DHL';
    case CarrierProvider.UPS:
      return 'UPS';
    case CarrierProvider.FEDEX:
      return 'FedEx';
    case CarrierProvider.USPS:
      return 'USPS';
    case CarrierProvider.DPD:
      return 'DPD';
    default:
      return 'Regional carrier';
  }
}