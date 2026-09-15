import { prisma } from '../db/prisma.js';
import { notifyOrderConfirmed } from '../lib/emails.js';
import { recordOrderSale } from '../services/ledger-entries.js';

/**
 * Marks a payment captured and records the sale exactly once per order.
 *
 * The sale is recorded here only for asynchronous payment flows (Stripe
 * Checkout / PayPal), which reach this function from the client settle route,
 * the Stripe webhook, or the PayPal webhook. Whichever fires first wins: the
 * compare-and-swap on the payment status PENDING/REQUIRES_REDIRECT -> CAPTURED
 * makes concurrent webhook + client settle mutually exclusive, so the ledger
 * sale entry can never be double-posted. COD and sandbox-captured orders are
 * recorded synchronously in the checkout route (orders.ts) and never reach
 * this function, so the two sale-recording paths are disjoint by payment flow.
 */
export async function markCaptured(orderId: string): Promise<void> {
  const captured = await prisma.$transaction(async tx => {
    const flipped = await tx.payment.updateMany({
      where: { orderId, status: { in: ['REQUIRES_REDIRECT', 'PENDING'] } },
      data: { status: 'CAPTURED' },
    });
    if (flipped.count === 0) return false;
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CAPTURED', status: 'CONFIRMED' },
    });
    return true;
  });

  if (!captured) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      currencyCode: true,
      subtotalMinorUnits: true,
      taxMinorUnits: true,
      shippingMinorUnits: true,
      totalMinorUnits: true,
    },
  });

  if (order) {
    await recordOrderSale({
      orderId,
      orderNumber: order.orderNumber,
      currencyCode: order.currencyCode,
      subtotalMinorUnits: BigInt(order.subtotalMinorUnits),
      taxMinorUnits: BigInt(order.taxMinorUnits),
      shippingMinorUnits: BigInt(order.shippingMinorUnits),
      totalMinorUnits: BigInt(order.totalMinorUnits),
    });
  }

  await notifyOrderConfirmed(orderId);
}

/**
 * Records an immutable refund event from a provider-initiated reversal
 * (charge.refunded / PAYMENT.CAPTURE.REFUNDED). Never mutates prior
 * financial records: it adds a Refund row and flips the order's payment
 * status. Idempotent by (orderId, providerPaymentId, amount).
 */
export async function recordRefund(opts: {
  provider: string;
  providerPaymentId: string;
  orderId: string;
  amountMinorUnits: number | bigint;
  currencyCode: string;
  reason: string;
}): Promise<void> {
  const amount = BigInt(opts.amountMinorUnits);
  const existing = await prisma.refund.findFirst({
    where: {
      orderId: opts.orderId,
      reason: opts.reason,
      amountMinorUnits: Number(amount),
      status: 'PROCESSED',
    },
  });
  if (existing) return;

  await prisma.$transaction([
    prisma.refund.create({
      data: {
        orderId: opts.orderId,
        amountMinorUnits: Number(amount),
        currencyCode: opts.currencyCode,
        reason: opts.reason,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: opts.orderId, providerPaymentId: opts.providerPaymentId },
      data: { status: 'REFUNDED' },
    }),
    prisma.order.update({
      where: { id: opts.orderId },
      data: { paymentStatus: 'REFUNDED' },
    }),
    prisma.auditLog.create({
      data: {
        action: `REFUND_${opts.provider.toUpperCase()}_WEBHOOK`,
        entity: 'Refund',
        entityId: opts.orderId,
        after: JSON.stringify({ provider: opts.provider, amountMinorUnits: amount.toString(), currencyCode: opts.currencyCode }),
      },
    }),
  ]);
}
