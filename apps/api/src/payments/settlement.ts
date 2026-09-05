import { prisma } from '../index.js';

export async function markCaptured(orderId: string): Promise<void> {
  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId, status: { in: ['REQUIRES_REDIRECT', 'PENDING'] } },
      data: { status: 'CAPTURED' },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CAPTURED', status: 'CONFIRMED' },
    }),
  ]);
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
