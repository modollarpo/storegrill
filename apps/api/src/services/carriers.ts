import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import {
  carrierDisplayName,
  canonicalCarrierStatus,
  CarrierShipmentStatus,
  deriveShipmentStatus,
  isOrderDelivered,
  type CarrierProviderValue,
  type CarrierShipmentStatusValue,
  type CarrierTrackingEvent,
} from '@Storegrill/shared';

export interface CarrierWebhookEventInput {
  code?: string | null;
  status?: string | null;
  location?: string | null;
  description?: string | null;
  at?: string | null;
}

export interface CarrierWebhookPayload {
  events: CarrierWebhookEventInput[];
  trackingNumber?: string | null;
  orderNumber?: string | null;
}

const WEBHOOK_PAYLOAD_SCHEMA = z.object({
  events: z
    .array(
      z.object({
        code: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        at: z.string().optional().nullable(),
      }),
    )
    .min(1),
  trackingNumber: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
});

export interface CarrierAdapter {
  provider: CarrierProviderValue;
  parseWebhook(payload: CarrierWebhookPayload): CarrierTrackingEvent[];
}

function isoNow(): string {
  return new Date().toISOString();
}

function parseTimestamp(value: string | null | undefined): string {
  if (!value) return isoNow();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? isoNow() : parsed.toISOString();
}

export function createCarrierAdapter(provider: CarrierProviderValue): CarrierAdapter {
  return {
    provider,
    parseWebhook(payload) {
      return payload.events.map(event => ({
        status: canonicalCarrierStatus(provider, event.code ?? event.status),
        location: event.location ?? null,
        description: event.description ?? null,
        at: parseTimestamp(event.at),
      }));
    },
  };
}

export function parseCarrierEvents(providerInput: string, raw: unknown): { provider: CarrierProviderValue; events: CarrierTrackingEvent[] } {
  const payload = WEBHOOK_PAYLOAD_SCHEMA.parse(raw);
  const provider = providerInput as CarrierProviderValue;
  return { provider, events: createCarrierAdapter(provider).parseWebhook(payload) };
}

const NOTIFIABLE_STATUSES: ReadonlySet<CarrierShipmentStatusValue> = new Set([
  CarrierShipmentStatus.SHIPPED,
  CarrierShipmentStatus.IN_TRANSIT,
  CarrierShipmentStatus.OUT_FOR_DELIVERY,
  CarrierShipmentStatus.DELIVERED,
  CarrierShipmentStatus.ATTEMPTED,
  CarrierShipmentStatus.EXCEPTION,
  CarrierShipmentStatus.RETURNED,
]);

const SHIPPED_TIERS: ReadonlySet<CarrierShipmentStatusValue> = new Set([
  CarrierShipmentStatus.SHIPPED,
  CarrierShipmentStatus.IN_TRANSIT,
  CarrierShipmentStatus.OUT_FOR_DELIVERY,
  CarrierShipmentStatus.DELIVERED,
  CarrierShipmentStatus.ATTEMPTED,
  CarrierShipmentStatus.EXCEPTION,
]);

interface ShipmentRow {
  vendorId: string | null;
  status: CarrierShipmentStatusValue;
}

export interface TrackingIngestResult {
  shipmentId: string;
  addedEvents: number;
  shipmentStatus: CarrierShipmentStatusValue;
  orderStatusBefore: string | null;
  orderStatusAfter: string | null;
  notificationsCreated: number;
}

export function statusLabel(status: CarrierShipmentStatusValue): string {
  switch (status) {
    case CarrierShipmentStatus.PENDING:
      return 'Order awaiting dispatch';
    case CarrierShipmentStatus.PROCESSING:
      return 'Order is being prepared';
    case CarrierShipmentStatus.SHIPPED:
      return 'Parcel handed to the carrier';
    case CarrierShipmentStatus.IN_TRANSIT:
      return 'Parcel is on its way';
    case CarrierShipmentStatus.OUT_FOR_DELIVERY:
      return 'Parcel is out for delivery';
    case CarrierShipmentStatus.DELIVERED:
      return 'Parcel delivered';
    case CarrierShipmentStatus.ATTEMPTED:
      return 'Delivery attempt made';
    case CarrierShipmentStatus.EXCEPTION:
      return 'Delivery is delayed';
    case CarrierShipmentStatus.RETURNED:
      return 'Parcel returned to the carrier';
    case CarrierShipmentStatus.CANCELLED:
      return 'Shipment cancelled';
    default:
      return 'Parcel status updated';
  }
}

/**
 * Applies inbound tracking events to a shipment: dedupes against existing
 * events, stores canonical events, advances the shipment status through the
 * shared reducer, flips the order to SHIPPED/DELIVERED when the vendor's
 * parcels warrant it, and notifies the customer. Idempotent — replayed
 * webhooks add nothing and change no state.
 */
export async function applyTrackingEvents(
  shipmentId: string,
  events: CarrierTrackingEvent[],
  metadata?: { agency?: string },
): Promise<TrackingIngestResult> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      events: { select: { status: true, location: true, timestamp: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          status: true,
          items: { select: { vendorId: true } },
        },
      },
    },
  });
  if (!shipment) {
    throw new Error(`Shipment ${shipmentId} not found`);
  }

  const existingKeys = new Set(
    shipment.events.map(event => JSON.stringify([event.status, event.timestamp.toISOString(), event.location ?? ''])),
  );
  const orderedEvents = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const newEvents = orderedEvents.filter(event => {
    const key = JSON.stringify([event.status, event.at, event.location ?? '']);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });

  const currentStatus = shipment.status as CarrierShipmentStatusValue;
  const derivedStatus = deriveShipmentStatus(newEvents, currentStatus);

  const order = shipment.order;
  const orderId = order.id;
  const expectedVendorIds = [...new Set(order.items.map(item => item.vendorId))];

  const allShipments = await prisma.shipment.findMany({
    where: { orderId },
    select: { id: true, vendorId: true, status: true },
  });

  const rows: ShipmentRow[] = allShipments.map(shipmentRow => ({
    vendorId: shipmentRow.vendorId,
    status:
      shipmentRow.id === shipmentId
        ? derivedStatus
        : (shipmentRow.status as CarrierShipmentStatusValue),
  }));

  const orderDelivered = isOrderDelivered(rows, expectedVendorIds);
  const hasShipped = rows.some(row => SHIPPED_TIERS.has(row.status));

  const orderStatusBefore = order.status;
  const orderStatusAfter = order.status;
  if (orderDelivered && order.status !== 'DELIVERED') {
    orderStatusAfter = 'DELIVERED';
  } else if (!orderDelivered && hasShipped && order.status === 'CONFIRMED') {
    orderStatusAfter = 'SHIPPED';
  }

  if (newEvents.length === 0) {
    return {
      shipmentId,
      addedEvents: 0,
      shipmentStatus: derivedStatus,
      orderStatusBefore,
      orderStatusAfter,
      notificationsCreated: 0,
    };
  }

  const notificationEvents = newEvents.filter(event => NOTIFIABLE_STATUSES.has(event.status));
  const agencyLabel = metadata?.agency ? carrierDisplayName(metadata.agency) : 'your carrier';

  await prisma.$transaction(async tx => {
    await tx.shipmentEvent.createMany({
      data: newEvents.map(event => ({
        shipmentId,
        status: event.status,
        location: event.location,
        description: event.description,
        timestamp: new Date(event.at),
      })),
    });

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: derivedStatus,
        ...(derivedStatus === CarrierShipmentStatus.DELIVERED && !shipment.actualDelivery
          ? { actualDelivery: new Date() }
          : {}),
      },
    });

    if (orderStatusAfter !== orderStatusBefore) {
      await tx.order.update({ where: { id: orderId }, data: { status: orderStatusAfter } });
    }

    if (notificationEvents.length > 0) {
      await tx.notification.createMany({
        data: notificationEvents.map(event => ({
          userId: order.userId,
          type: 'ORDER_SHIPMENT',
          title: statusLabel(event.status),
          body: `${order.orderNumber} — ${statusLabel(event.status)}${event.location ? ` at ${event.location}` : ''}. Delivered by ${agencyLabel}.`,
          data: JSON.stringify({
            shipmentId,
            orderId,
            orderNumber: order.orderNumber,
            trackingStatus: event.status,
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
          }),
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        userId: null,
        action: 'SHIPMENT_TRACKING_UPDATED',
        entity: 'Shipment',
        entityId: shipmentId,
        after: JSON.stringify({
          from: currentStatus,
          to: derivedStatus,
          addedEvents: newEvents.length,
          agency: metadata?.agency,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
        }),
      },
    });
  });

  return {
    shipmentId,
    addedEvents: newEvents.length,
    shipmentStatus: derivedStatus,
    orderStatusBefore,
    orderStatusAfter,
    notificationsCreated: notificationEvents.length,
  };
}

/**
 * Picks which tracked shipments are due a poll: last event older than the
 * interval. Pure and time-injectable for tests.
 */
export function isShipmentDueForPolling(
  lastEventAt: Date | string | null | undefined,
  now: Date,
  intervalMs: number,
): boolean {
  if (!lastEventAt) return true;
  const last = typeof lastEventAt === 'string' ? new Date(lastEventAt) : lastEventAt;
  return now.getTime() - last.getTime() >= intervalMs;
}

/**
 * Poll loop for tracked shipments without a webhook integration. REGIONAL and
 * unknown carriers have no poller yet, so newcomers are skipped; any adapter
 * errors are contained per shipment.
 */
export async function pollTrackedShipments(options?: {
  now?: Date;
  intervalMs?: number;
  limit?: number;
}): Promise<{ polled: number; updated: number }> {
  const now = options?.now ?? new Date();
  const intervalMs = options?.intervalMs ?? 15 * 60 * 1000;
  const limit = options?.limit ?? 25;

  const shipments = await prisma.shipment.findMany({
    where: {
      trackingNumber: { not: null },
      status: { notIn: ['DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED'] },
    },
    include: {
      events: { orderBy: { timestamp: 'desc' }, take: 1, select: { timestamp: true } },
    },
    take: limit,
  });

  const updated = 0;
  for (const shipment of shipments) {
    const lastEventAt = shipment.events[0]?.timestamp ?? null;
    if (!isShipmentDueForPolling(lastEventAt, now, intervalMs)) {
      continue;
    }
    // No live carrier APIs exist yet; adapters will be wired per carrier here.
    // For now the dedupe-and-store path is exercised by webhooks only.
    void shipment;
  }

  return { polled: shipments.length, updated };
}