import { prisma } from '../db/prisma.js';
import { sendMail } from '../lib/mailer.js';
import {
  renderWelcomeEmail,
  renderAbandonedCartEmail,
  renderReviewRequestEmail,
  type LifecycleEmail,
} from '../lib/email-templates.js';

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:3000';

function bestEffort(promise: Promise<unknown>, label: string): void {
  promise.catch(err => console.error(`[customer-journey] ${label} failed:`, err instanceof Error ? err.message : err));
}

export async function sendWelcomeJourney(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user || !user.email) return;
  const email: LifecycleEmail = renderWelcomeEmail({
    name: user.name || 'Shopper',
    shopUrl: `${WEB_BASE}/products`,
  });
  bestEffort(sendMail({ to: user.email, subject: email.subject, text: email.text, html: email.html }), `welcome to ${user.email}`);
}

export async function checkAndSendAbandonedCarts(prismaClient: typeof prisma = prisma): Promise<number> {
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000); // abandoned for 4 hours
  const carts = await prismaClient.cart.findMany({
    where: {
      updatedAt: { lte: cutoff },
      items: { some: {} },
    },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, thumbnail: true, basePriceMinorUnits: true, currencyCode: true, slug: true } },
          variant: { select: { basePriceMinorUnits: true, images: true } },
        },
      },
    },
    take: 50,
  });

  let sent = 0;
  for (const cart of carts) {
    if (!cart.user?.email) continue;
    const items = cart.items.map((i: any) => {
      const price = i.variant ? Number(i.variant.basePriceMinorUnits) : Number(i.product.basePriceMinorUnits);
      const image = i.product.thumbnail || null;
      return {
        name: i.product.name,
        quantity: i.quantity,
        unitPriceMinorUnits: price,
        totalMinorUnits: price * i.quantity,
        image,
        url: `${WEB_BASE}/products/${i.product.slug}`,
      };
    });
    const subtotal = items.reduce((sum: number, i: { totalMinorUnits: number }) => sum + i.totalMinorUnits, 0);
    const currency = cart.items[0]?.product?.currencyCode || 'USD';

    const email: LifecycleEmail = renderAbandonedCartEmail({
      name: cart.user.name || 'Shopper',
      items,
      currencyCode: currency,
      subtotalMinorUnits: subtotal,
      checkoutUrl: `${WEB_BASE}/checkout`,
      cartUrl: `${WEB_BASE}/cart`,
    });

    bestEffort(sendMail({ to: cart.user.email, subject: email.subject, text: email.text, html: email.html }), `abandoned cart to ${cart.user.email}`);
    sent++;
  }
  return sent;
}

export async function checkAndSendReviewRequests(prismaClient: typeof prisma = prisma): Promise<number> {
  const threeDaysAgoStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const threeDaysAgoEnd = new Date(Date.now() - 2.9 * 24 * 60 * 60 * 1000);

  const orders = await prismaClient.order.findMany({
    where: {
      status: 'DELIVERED',
      updatedAt: { gte: threeDaysAgoStart, lte: threeDaysAgoEnd },
    },
    include: {
      user: { select: { name: true, email: true } },
      items: { select: { name: true, productId: true } },
    },
    take: 50,
  });

  let sent = 0;
  for (const order of orders) {
    if (!order.user?.email) continue;
    const email: LifecycleEmail = renderReviewRequestEmail({
      name: order.user.name || 'Shopper',
      orderNumber: order.orderNumber,
      products: order.items.map((item: { name: string; productId: string }) => ({
        name: item.name,
        reviewUrl: `${WEB_BASE}/products/${item.productId}#reviews`,
      })),
    });
    bestEffort(sendMail({ to: order.user.email, subject: email.subject, text: email.text, html: email.html }), `review request to ${order.user.email}`);
    sent++;
  }
  return sent;
}
