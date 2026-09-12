import { prisma } from '../db/prisma.js';
import { sendMail } from './mailer.js';
import { statusLabel } from '../services/carriers.js';
import { CarrierShipmentStatus, type CarrierShipmentStatusValue } from '@Storegrill/shared';
import {
  escapeHtml,
  formatPrice,
  formatAddress,
  emailLayout,
  emailButton,
  renderItemsTable,
  renderTotalsBlock,
  callout,
  paragraph,
  SUPPORT_EMAIL,
} from './email-templates.js';

export { escapeHtml, formatPrice, formatAddress } from './email-templates.js';

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:3000';

const SHIPMENT_EMAIL_STATUSES = new Set<CarrierShipmentStatusValue>([
  CarrierShipmentStatus.SHIPPED,
  CarrierShipmentStatus.IN_TRANSIT,
  CarrierShipmentStatus.OUT_FOR_DELIVERY,
  CarrierShipmentStatus.DELIVERED,
  CarrierShipmentStatus.ATTEMPTED,
  CarrierShipmentStatus.EXCEPTION,
]);

export interface OrderEmailItem {
  name: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
  image?: string | null;
}

export interface OrderEmailTotals {
  subtotalMinorUnits: number;
  shippingMinorUnits: number;
  taxMinorUnits: number;
  discountMinorUnits: number;
  totalMinorUnits: number;
}

export interface OrderEmailSnapshot {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  currencyCode: string;
  items: OrderEmailItem[];
  totals: OrderEmailTotals;
  shippingAddress: string;
  orderUrl: string;
}

export function renderOrderConfirmationHtml(snapshot: OrderEmailSnapshot): string {
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Thanks for your order, ${escapeHtml(snapshot.customerName)}</p>
<p style="margin:0 0 20px;color:#6b5e83;font-size:14px;">Your order <strong>${escapeHtml(snapshot.orderNumber)}</strong> is confirmed. We will email you when it ships.</p>
${callout('Ship to', escapeHtml(snapshot.shippingAddress))}
${renderItemsTable(snapshot.items, snapshot.currencyCode)}
${renderTotalsBlock(snapshot.totals, snapshot.currencyCode)}
<div style="margin-top:24px;">${emailButton(snapshot.orderUrl, 'Track your order')}</div>
<p style="margin:0;color:#6b5e83;font-size:12px;line-height:1.6;">Items are sent by each vendor separately; you may receive more than one parcel.</p>`;
  return emailLayout({
    preheader: `Your order ${snapshot.orderNumber} is confirmed.`,
    body,
    footer: { keepOpen: true },
  });
}

export function renderOrderCancelledHtml(snapshot: OrderEmailSnapshot): string {
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Order cancelled, ${escapeHtml(snapshot.customerName)}</p>
<p style="margin:0 0 20px;color:#6b5e83;font-size:14px;">Order <strong>${escapeHtml(snapshot.orderNumber)}</strong> has been cancelled. Any payment was refunded to your original payment method — it may take a few days to appear.</p>
${renderItemsTable(snapshot.items, snapshot.currencyCode)}
${renderTotalsBlock(snapshot.totals, snapshot.currencyCode)}
<div style="margin-top:24px;">${emailButton(snapshot.orderUrl, 'Continue shopping')}</div>
<p style="margin:0;color:#6b5e83;font-size:12px;">If a refund does not arrive within 7 working days, contact ${SUPPORT_EMAIL}.</p>`;
  return emailLayout({
    preheader: `Order ${snapshot.orderNumber} has been cancelled.`,
    body,
    footer: { keepOpen: true },
  });
}

export interface ShipmentUpdateEmailInput {
  customerName: string;
  orderNumber: string;
  status: CarrierShipmentStatusValue;
  carrier: string;
  trackingNumber?: string | null;
  location?: string | null;
  orderUrl: string;
}

export function renderShipmentUpdateHtml(input: ShipmentUpdateEmailInput): string {
  const label = statusLabel(input.status);
  const locationLine = input.location ? ` near ${escapeHtml(input.location)}` : '';
  const trackingLine = input.trackingNumber
    ? `<p style="margin:16px 0 0;color:#6b5e83;font-size:13px;">Tracking: <strong>${escapeHtml(input.trackingNumber)}</strong></p>`
    : '';
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Your order is on the move, ${escapeHtml(input.customerName)}</p>
<p style="margin:0 0 8px;color:#6b5e83;font-size:14px;">${escapeHtml(label)}${locationLine} for order <strong>${escapeHtml(input.orderNumber)}</strong>. Carrier: <strong>${escapeHtml(input.carrier)}</strong>.</p>
${callout('Latest status', `<span style="font-size:16px;font-weight:bold;color:#20162e;">${escapeHtml(label)}</span>`)}
${trackingLine}
<div style="margin-top:24px;">${emailButton(input.orderUrl, 'Track your order')}</div>`;
  return emailLayout({
    preheader: `Update on order ${input.orderNumber}: ${label}`,
    body,
    footer: { keepOpen: true },
  });
}

export interface VendorAlertEmailInput {
  storeName: string;
  orderNumber: string;
  orderUrl: string;
  currencyCode: string;
  items: OrderEmailItem[];
  subtotalMinorUnits: number;
}

export function renderVendorAlertHtml(input: VendorAlertEmailInput): string {
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">New Storegrill order for ${escapeHtml(input.storeName)}</p>
${paragraph(`Order <strong>${escapeHtml(input.orderNumber)}</strong> has been placed. Please fulfil it promptly to keep delivery estimates on track.`)}
${renderItemsTable(input.items, input.currencyCode)}
<p style="margin:8px 0 0;color:#20162e;font-size:14px;font-weight:bold;text-align:right;">Subtotal ${escapeHtml(formatPrice(input.subtotalMinorUnits, input.currencyCode))}</p>
<div style="margin-top:14px;">${emailButton(input.orderUrl, 'Open vendor dashboard')}</div>`;
  return emailLayout({
    preheader: `New order ${input.orderNumber} for ${input.storeName}`,
    body,
    footer: { keepOpen: true },
  });
}

function queryOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currencyCode: true,
      subtotalMinorUnits: true,
      shippingMinorUnits: true,
      taxMinorUnits: true,
      discountMinorUnits: true,
      totalMinorUnits: true,
      shippingAddress: true,
      user: { select: { name: true, email: true } },
      items: {
        select: {
          name: true,
          quantity: true,
          unitPriceMinorUnits: true,
          totalMinorUnits: true,
          image: true,
          vendor: {
            select: {
              userId: true,
              storeName: true,
              supportEmail: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });
}

function snapshotFromOrder(order: NonNullable<Awaited<ReturnType<typeof queryOrderForEmail>>>): OrderEmailSnapshot {
  return {
    orderNumber: order.orderNumber,
    customerName: order.user?.name || 'valued customer',
    customerEmail: order.user?.email || '',
    currencyCode: order.currencyCode,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceMinorUnits: item.unitPriceMinorUnits,
      totalMinorUnits: item.totalMinorUnits,
      image: item.image,
    })),
    totals: {
      subtotalMinorUnits: order.subtotalMinorUnits,
      shippingMinorUnits: order.shippingMinorUnits,
      taxMinorUnits: order.taxMinorUnits,
      discountMinorUnits: order.discountMinorUnits,
      totalMinorUnits: order.totalMinorUnits,
    },
    shippingAddress: formatAddress(order.shippingAddress),
    orderUrl: `${WEB_BASE}/account/orders/${order.id}`,
  };
}

function bestEffort(promise: Promise<unknown>, label: string): void {
  promise.catch(err => console.error(`[emails] ${label} failed:`, err instanceof Error ? err.message : err));
}

async function claimConfirmation(orderId: string): Promise<boolean> {
  const claim = await prisma.order.updateMany({
    where: { id: orderId, confirmationSentAt: null },
    data: { confirmationSentAt: new Date() },
  });
  return claim.count === 1;
}

export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  if (!(await claimConfirmation(orderId))) return;

  const order = await queryOrderForEmail(orderId);
  if (!order) return;
  const snapshot = snapshotFromOrder(order);

  if (snapshot.customerEmail) {
    bestEffort(
      sendMail({
        to: snapshot.customerEmail,
        subject: `Order ${snapshot.orderNumber} confirmed`,
        text: `Thanks for your order, ${snapshot.customerName}. Order ${snapshot.orderNumber} is confirmed. Track it here: ${snapshot.orderUrl}`,
        html: renderOrderConfirmationHtml(snapshot),
      }),
      `confirmation sent to ${snapshot.customerEmail}`,
    );
  }

  const vendors = new Map<string, { storeName: string; email?: string; items: OrderEmailItem[] }>();
  for (const item of order.items) {
    if (!item.vendor) continue;
    const entry = vendors.get(item.vendor.userId) ?? {
      storeName: item.vendor.storeName,
      email: item.vendor.supportEmail || item.vendor.user?.email || undefined,
      items: [],
    };
    entry.items.push({
      name: item.name,
      quantity: item.quantity,
      unitPriceMinorUnits: item.unitPriceMinorUnits,
      totalMinorUnits: item.totalMinorUnits,
      image: item.image,
    });
    vendors.set(item.vendor.userId, entry);
  }

  for (const vendor of vendors.values()) {
    if (!vendor.email) continue;
    const vendorSubtotal = vendor.items.reduce((sum, item) => sum + item.totalMinorUnits, 0);
    bestEffort(
      sendMail({
        to: vendor.email,
        subject: `New order ${snapshot.orderNumber} for ${vendor.storeName}`,
        text: `You have a new Storegrill order, ${snapshot.orderNumber}, from ${snapshot.customerName}. ${snapshot.orderUrl}`,
        html: renderVendorAlertHtml({
          storeName: vendor.storeName,
          orderNumber: snapshot.orderNumber,
          orderUrl: `${WEB_BASE}/account/orders/${order.id}`,
          currencyCode: snapshot.currencyCode,
          items: vendor.items,
          subtotalMinorUnits: vendorSubtotal,
        }),
      }),
      `vendor alert sent to ${vendor.email}`,
    );
  }
}

export async function notifyOrderCancelled(orderId: string): Promise<void> {
  const order = await queryOrderForEmail(orderId);
  if (!order || order.status !== 'CANCELLED') return;
  const snapshot = snapshotFromOrder(order);
  if (!snapshot.customerEmail) return;

  bestEffort(
    sendMail({
      to: snapshot.customerEmail,
      subject: `Order ${snapshot.orderNumber} cancelled`,
      text: `Order ${snapshot.orderNumber} has been cancelled. Any payment was refunded. ${WEB_BASE}/account/orders/${order.id}`,
      html: renderOrderCancelledHtml(snapshot),
    }),
    `cancellation sent to ${snapshot.customerEmail}`,
  );
}

export async function sendShipmentStatusEmail(shipmentId: string, status: CarrierShipmentStatusValue): Promise<void> {
  if (!SHIPMENT_EMAIL_STATUSES.has(status)) return;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      carrier: true,
      trackingNumber: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!shipment?.order?.user?.email) return;

  const events = await prisma.shipmentEvent.findMany({
    where: { shipmentId, status },
    select: { location: true },
    orderBy: { timestamp: 'desc' },
    take: 1,
  });

  const order = shipment.order;
  bestEffort(
    sendMail({
      to: order.user!.email!,
      subject: `Update on order ${order.orderNumber}`,
      text: `${statusLabel(status)} for order ${order.orderNumber} via ${shipment.carrier}. Track: ${WEB_BASE}/account/orders/${order.id}`,
      html: renderShipmentUpdateHtml({
        customerName: order.user!.name || 'valued customer',
        orderNumber: order.orderNumber,
        status,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        location: events[0]?.location ?? null,
        orderUrl: `${WEB_BASE}/account/orders/${order.id}`,
      }),
    }),
    `shipment update sent for shipment ${shipmentId}`,
  );
}