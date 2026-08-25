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
