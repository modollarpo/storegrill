import { prisma } from '../db/prisma.js';
import { sendMail } from './mailer.js';
import { statusLabel } from '../services/carriers.js';
import { createMoney, formatMoney } from '@Storegrill/shared';
import { CarrierShipmentStatus, type CarrierShipmentStatusValue } from '@Storegrill/shared';

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:3000';
const SUPPORT_EMAIL = 'support@storegrill.net';

const BRAND_GRADIENT = 'linear-gradient(135deg,#1c073d 0%,#4c12a1 100%)';
const BRAND_TEXT = '#f2ebfb';
const BODY_BG = '#f5f2fa';
const CARD_BG = '#ffffff';
const MUTED_TEXT = '#6b5e83';
const ACCENT = '#4c12a1';

const SHIPMENT_EMAIL_STATUSES = new Set<CarrierShipmentStatusValue>([
  CarrierShipmentStatus.SHIPPED,
  CarrierShipmentStatus.IN_TRANSIT,
  CarrierShipmentStatus.OUT_FOR_DELIVERY,
  CarrierShipmentStatus.DELIVERED,
  CarrierShipmentStatus.ATTEMPTED,
  CarrierShipmentStatus.EXCEPTION,
]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPrice(amountMinorUnits: number, currencyCode: string): string {
  return formatMoney(createMoney(BigInt(amountMinorUnits), currencyCode));
}

export function formatAddress(json: string): string {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const parts = [parsed.name, parsed.line1, parsed.line2, parsed.city, parsed.county, parsed.postcode, parsed.country]
      .filter((part): part is string => typeof part === 'string' && part.trim() !== '' && part !== 'undefined')
      .map(part => part.trim());
    return parts.join(', ') || 'Address on account';
  } catch {
    return 'Address on account';
  }
}

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

function layout(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BODY_BG};padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="border-radius:14px 14px 0 0;background:${BRAND_GRADIENT};padding:22px 28px;">
            <div style="color:${BRAND_TEXT};font-size:22px;font-weight:bold;letter-spacing:0.5px;">Storegrill</div>
            <div style="color:${BRAND_TEXT};opacity:0.75;font-size:12px;margin-top:2px;">Shop trusted partners in your local currency</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:${CARD_BG};padding:32px 28px;border-left:1px solid #eee8f5;border-right:1px solid #eee8f5;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:${CARD_BG};border-radius:0 0 14px 14px;border:1px solid #eee8f5;border-top:none;padding:8px 28px 28px;">
            <div style="font-size:11px;color:${MUTED_TEXT};line-height:1.7;">
              Questions about your order? <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT};">${SUPPORT_EMAIL}</a><br />
              &copy; ${new Date().getFullYear()} Storegrill Inc Ltd. All rights reserved.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background-color:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

function itemsTable(items: OrderEmailItem[], currencyCode: string): string {
  const rows = items
    .map(item => {
      const imageCell = item.image
        ? `<img src="${escapeHtml(item.image)}" width="52" height="52" alt="" style="border-radius:6px;" />`
        : '<span style="width:52px;height:52px;display:inline-block;background-color:#efE8f8;border-radius:6px;"></span>';
      return `<tr>
  <td style="padding:10px 8px;border-bottom:1px solid #f0eaf8;vertical-align:middle;">${imageCell}</td>
  <td style="padding:10px 8px;border-bottom:1px solid #f0eaf8;font-size:13px;color:#20162e;">${escapeHtml(item.name)}<br /><span style="color:${MUTED_TEXT};font-size:12px;">Qty ${item.quantity}</span></td>
  <td style="padding:10px 8px;border-bottom:1px solid #f0eaf8;font-size:13px;color:#20162e;text-align:right;">${escapeHtml(formatPrice(item.totalMinorUnits, currencyCode))}</td>
</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<thead><tr>
<th style="text-align:left;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED_TEXT};border-bottom:2px solid ${ACCENT};">Item</th>
<th style="text-align:right;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED_TEXT};border-bottom:2px solid ${ACCENT};">Total</th>
</tr></thead>
<tbody>${rows}</tbody></table>`;
}

function totalsBlock(totals: OrderEmailTotals, currencyCode: string): string {
  const discountRow =
    totals.discountMinorUnits > 0
      ? `<tr><td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Discount</td><td style="padding:4px 0;font-size:13px;color:#16a34a;text-align:right;">&minus; ${escapeHtml(formatPrice(totals.discountMinorUnits, currencyCode))}</td></tr>`
      : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Subtotal</td><td style="padding:4px 0;font-size:13px;color:#20162e;text-align:right;">${escapeHtml(formatPrice(totals.subtotalMinorUnits, currencyCode))}</td></tr>
<tr><td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Shipping</td><td style="padding:4px 0;font-size:13px;color:#20162e;text-align:right;">${escapeHtml(formatPrice(totals.shippingMinorUnits, currencyCode))}</td></tr>
<tr><td style="padding:4px 0;font-size:13px;color:${MUTED_TEXT};">Tax</td><td style="padding:4px 0;font-size:13px;color:#20162e;text-align:right;">${escapeHtml(formatPrice(totals.taxMinorUnits, currencyCode))}</td></tr>
${discountRow}
<tr><td style="padding:8px 0 0;font-size:15px;font-weight:bold;color:#20162e;border-top:2px solid ${ACCENT};">Total</td><td style="padding:8px 0 0;font-size:15px;font-weight:bold;color:#20162e;border-top:2px solid ${ACCENT};text-align:right;">${escapeHtml(formatPrice(totals.totalMinorUnits, currencyCode))}</td></tr>
</table>`;
}

export function renderOrderConfirmationHtml(snapshot: OrderEmailSnapshot): string {
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Thanks for your order, ${escapeHtml(snapshot.customerName)}</p>
<p style="margin:0 0 20px;color:${MUTED_TEXT};font-size:14px;">Your order <strong>${escapeHtml(snapshot.orderNumber)}</strong> is confirmed. We will email you when it ships.</p>
<div style="background-color:#f7f3fd;border:1px solid #eee8f5;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED_TEXT};margin-bottom:6px;">Ship to</div>
  <div style="font-size:13px;color:#20162e;">${escapeHtml(snapshot.shippingAddress)}</div>
</div>
${itemsTable(snapshot.items, snapshot.currencyCode)}
${totalsBlock(snapshot.totals, snapshot.currencyCode)}
<div style="margin-top:24px;">${ctaButton(snapshot.orderUrl, 'Track your order')}</div>
<p style="margin:0;color:${MUTED_TEXT};font-size:12px;line-height:1.6;">Items are sent by each vendor separately; you may receive more than one parcel.</p>`;
  return layout(`Order ${snapshot.orderNumber} confirmed`, body);
}

export function renderOrderCancelledHtml(snapshot: OrderEmailSnapshot): string {
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Order cancelled, ${escapeHtml(snapshot.customerName)}</p>
<p style="margin:0 0 20px;color:${MUTED_TEXT};font-size:14px;">Order <strong>${escapeHtml(snapshot.orderNumber)}</strong> has been cancelled. Any payment was refunded to your original payment method — it may take a few days to appear.</p>
${itemsTable(snapshot.items, snapshot.currencyCode)}
${totalsBlock(snapshot.totals, snapshot.currencyCode)}
<div style="margin-top:24px;">${ctaButton(snapshot.orderUrl, 'Continue shopping')}</div>
<p style="margin:0;color:${MUTED_TEXT};font-size:12px;">If a refund does not arrive within 7 working days, contact ${SUPPORT_EMAIL}.</p>`;
  return layout(`Order ${snapshot.orderNumber} cancelled`, body);
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
    ? `<p style="margin:16px 0 0;color:${MUTED_TEXT};font-size:13px;">Tracking: <strong>${escapeHtml(input.trackingNumber)}</strong></p>`
    : '';
  const body = `
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#20162e;">Your order is on the move, ${escapeHtml(input.customerName)}</p>
<p style="margin:0 0 8px;color:${MUTED_TEXT};font-size:14px;">${escapeHtml(label)}${locationLine} for order <strong>${escapeHtml(input.orderNumber)}</strong>. Carrier: <strong>${escapeHtml(input.carrier)}</strong>.</p>
<div style="background-color:#f7f3fd;border:1px solid #eee8f5;border-radius:10px;padding:16px 18px;margin-top:12px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED_TEXT};">Latest status</div>
  <div style="font-size:16px;font-weight:bold;color:#20162e;margin-top:4px;">${escapeHtml(label)}</div>
</div>
${trackingLine}
<div style="margin-top:24px;">${ctaButton(input.orderUrl, 'Track your order')}</div>`;
  return layout(`Update on order ${input.orderNumber}`, body);
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
<p style="margin:0 0 20px;color:${MUTED_TEXT};font-size:14px;">Order <strong>${escapeHtml(input.orderNumber)}</strong> has been placed. Please fulfil it promptly to keep delivery estimates on track.</p>
${itemsTable(input.items, input.currencyCode)}
<p style="margin:8px 0 0;color:#20162e;font-size:14px;font-weight:bold;text-align:right;">Subtotal ${escapeHtml(formatPrice(input.subtotalMinorUnits, input.currencyCode))}</p>
<div style="margin-top:14px;">${ctaButton(input.orderUrl, 'Open vendor dashboard')}</div>`;
  return layout(`New order ${input.orderNumber} — ${input.storeName}`, body);
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