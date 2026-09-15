import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';

type LedgerModule = typeof import('./ledger-entries.js');
type PayoutsModule = typeof import('./payouts.js');

let prisma: PrismaClient;
let ledger: LedgerModule;
let payouts: PayoutsModule;

const hasPostgresTestDb = (() => {
  const url = process.env.TEST_DATABASE_URL;
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
})();

describe.skipIf(!hasPostgresTestDb)('financial lifecycle integration', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    process.env.NODE_ENV = 'test';
    const db = await import('../db/prisma.js');
    prisma = db.prisma;
    ledger = await import('./ledger-entries.js');
    payouts = await import('./payouts.js');
    await prisma.$connect();
  });

  afterAll(() => {
    void prisma?.$disconnect();
  });

  it('order → refund → payout → paid lifecycle nets to zero across all ledger entries', async () => {
    const ts = Date.now();
    const user = await prisma.user.create({
      data: { email: `fin-lifecycle-${ts}@storegrill.net`, name: 'Lifecycle Tester' },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        storeName: `Lifecycle House ${ts}`,
        slug: `lifecycle-house-${ts}`,
        status: 'ACTIVE',
        revenueSharePct: 85,
        fixedFeeMinorUnits: 30,
      },
    });
    const category = await prisma.category.create({
      data: { name: `Lifecycle Cat ${ts}`, slug: `lifecycle-cat-${ts}` },
    });
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: 'Lifecycle Widget',
        slug: `lifecycle-widget-${ts}`,
        description: 'A lifecycle test widget',
        sku: `LIFECYCLE-${ts}`,
        basePriceMinorUnits: 2000,
        currencyCode: 'GBP',
        categoryId: category.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `SG-FIN-${ts}`,
        userId: user.id,
        regionKey: 'UK',
        currencyCode: 'GBP',
        subtotalMinorUnits: 2000,
        taxMinorUnits: 400,
        shippingMinorUnits: 299,
        discountMinorUnits: 0,
        totalMinorUnits: 2699,
        paymentMethod: 'cod',
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        shippingAddress: JSON.stringify({ street: '1 Fin St', city: 'London', state: '', zip: 'N1 1AA', country: 'GB' }),
        items: {
          create: {
            productId: product.id,
            vendorId: vendor.id,
            name: 'Lifecycle Widget',
            sku: `LIFECYCLE-${ts}`,
            quantity: 1,
            unitPriceMinorUnits: 2000,
            totalMinorUnits: 2000,
            taxMinorUnits: 400,
            commissionMinorUnits: 300n,
            commissionRateBps: 1500,
            commissionBasis: 'GROSS_ORDER',
            commissionSnapshot: JSON.stringify({ basis: 'GROSS_ORDER', rateBps: 1500, commissionMinorUnits: 300 }),
          },
        },
      },
    });

    const orderItem = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
    expect(orderItem).not.toBeNull();

    let payout: { id: string; amountMinorUnits: number; status: string } | null = null;
    try {
      await ledger.recordOrderSale({
        orderId: order.id,
        orderNumber: order.orderNumber,
        currencyCode: 'GBP',
        subtotalMinorUnits: 2000n,
        taxMinorUnits: 400n,
        shippingMinorUnits: 299n,
        totalMinorUnits: 2699n,
      });

      await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });

      const payoutCount = await payouts.generatePayouts(`2026-09`);
      expect(payoutCount).toBeGreaterThanOrEqual(1);
      payout = await prisma.payout.findFirst({ where: { vendorId: vendor.id, period: '2026-09' }, orderBy: { createdAt: 'desc' } });
      expect(payout).not.toBeNull();
      expect(payout!.status).toBe('PENDING');

      await ledger.recordOrderRefund({
        orderId: order.id,
        orderNumber: order.orderNumber,
        currencyCode: 'GBP',
        subtotalMinorUnits: 2000n,
        taxMinorUnits: 400n,
        shippingMinorUnits: 299n,
        totalMinorUnits: 2699n,
      });

      await prisma.payout.update({ where: { id: payout!.id }, data: { status: 'PAID', processedAt: new Date() } });
      await ledger.recordPayoutPaid({
        payoutId: payout!.id,
        currencyCode: 'GBP',
        payoutMinorUnits: BigInt(payout!.amountMinorUnits),
      });

      await prisma.payout.update({ where: { id: payout!.id }, data: { status: 'PENDING', processedAt: null } });
      await ledger.recordPayoutPaidReversal({
        payoutId: payout!.id,
        currencyCode: 'GBP',
        payoutMinorUnits: BigInt(payout!.amountMinorUnits),
      });

      const allTx = await prisma.ledgerTransaction.findMany({
        where: { OR: [{ referenceId: order.id }, { referenceId: payout!.id }] },
        include: { entries: true },
      });
      expect(allTx.length).toBeGreaterThanOrEqual(4); // sale, settlement (payout gen), refund, payout-paid, payout-reversal

      let globalDebit = 0n;
      let globalCredit = 0n;
      for (const tx of allTx) {
        let txDebit = 0n;
        let txCredit = 0n;
        for (const e of tx.entries) {
          if (e.direction === 'DEBIT') {
            txDebit += e.amountMinorUnits;
            globalDebit += e.amountMinorUnits;
          } else {
            txCredit += e.amountMinorUnits;
            globalCredit += e.amountMinorUnits;
          }
        }
        expect(txDebit).toBe(txCredit);
      }
      expect(globalDebit).toBe(globalCredit);

      const cashAccounts = await prisma.ledgerAccount.findMany({ where: { code: { startsWith: 'CASH_' } } });
      if (cashAccounts.length) {
        const cashEntries = await prisma.ledgerEntry.findMany({
          where: {
            accountId: { in: cashAccounts.map(a => a.id) },
            transaction: { OR: [{ referenceId: order.id }, { referenceId: payout!.id }] },
          },
        });
        let cashNet = 0n;
        for (const e of cashEntries) cashNet += (e.direction === 'DEBIT' ? 1n : -1n) * e.amountMinorUnits;
        expect(cashNet).toBe(0n);
      }
    } finally {
      await prisma.payoutLine.deleteMany({ where: { payoutId: payout?.id ?? '' } });
      if (payout) await prisma.payout.delete({ where: { id: payout.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.refund.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.ledgerEntry.deleteMany({ where: { transaction: { referenceId: { in: [order.id, payout?.id ?? ''] } } } });
      await prisma.ledgerTransaction.deleteMany({ where: { OR: [{ referenceId: order.id }, { referenceId: payout?.id ?? '' }] } });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.category.delete({ where: { id: category.id } });
      await prisma.vendorProfile.delete({ where: { id: vendor.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 30_000);

  it('markCaptured CAS: concurrent captures record the sale exactly once', async () => {
    const ts = Date.now() + 10;
    const user = await prisma.user.create({
      data: { email: `cap-cas-${ts}@storegrill.net`, name: 'CAS Tester' },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        storeName: `CAS House ${ts}`,
        slug: `cas-house-${ts}`,
        status: 'ACTIVE',
        revenueSharePct: 100,
        fixedFeeMinorUnits: 0,
      },
    });
    const category = await prisma.category.create({
      data: { name: `CAS Cat ${ts}`, slug: `cas-cat-${ts}` },
    });
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: 'CAS Widget',
        slug: `cas-widget-${ts}`,
        description: 'A CAS test widget',
        sku: `CAS-${ts}`,
        categoryId: category.id,
        basePriceMinorUnits: 500,
        currencyCode: 'GBP',
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `SG-CAS-${ts}`,
        userId: user.id,
        regionKey: 'UK',
        currencyCode: 'GBP',
        subtotalMinorUnits: 500,
        taxMinorUnits: 0,
        shippingMinorUnits: 0,
        totalMinorUnits: 500,
        paymentMethod: 'stripe',
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        shippingAddress: JSON.stringify({ street: '1 CAS St', city: 'London', state: '', zip: 'N1 1AA', country: 'GB' }),
        payments: {
          create: {
            method: 'stripe',
            providerPaymentId: `cs_cas_test_${ts}`,
            amountMinorUnits: 500,
            currencyCode: 'GBP',
            status: 'PENDING',
          },
        },
      },
    });

    const settlement = await import('../payments/settlement.js');
    try {
      await Promise.all([
        settlement.markCaptured(order.id),
        settlement.markCaptured(order.id),
      ]);

      const saleTx = await prisma.ledgerTransaction.findMany({
        where: { referenceId: order.id, referenceType: 'PAYMENT' },
      });
      expect(saleTx.length).toBe(1);
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.paymentStatus).toBe('CAPTURED');
    } finally {
      await prisma.ledgerEntry.deleteMany({ where: { transaction: { referenceId: order.id } } });
      await prisma.ledgerTransaction.deleteMany({ where: { referenceId: order.id } });
      await prisma.payment.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.category.delete({ where: { id: category.id } });
      await prisma.vendorProfile.delete({ where: { id: vendor.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 20_000);
});
