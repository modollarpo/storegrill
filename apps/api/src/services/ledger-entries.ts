import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { recordLedgerTransaction } from './ledger.js';

export interface OrderLedgerContext {
  orderId: string;
  orderNumber: string;
  currencyCode: string;
  subtotalMinorUnits: bigint;
  taxMinorUnits: bigint;
  shippingMinorUnits: bigint;
  totalMinorUnits: bigint;
}

/**
 * Records the double-entry sale for a confirmed order:
 *   DR  CASH_<CCY>              total
 *   CR  SALES_REVENUE_<CCY>     subtotal
 *   CR  SHIPPING_REVENUE_<CCY>  shipping
 *   CR  TAX_PAYABLE_<CCY>       tax
 */
export async function recordOrderSale(
  ctx: OrderLedgerContext,
  prisma: PrismaClient = db,
): Promise<string> {
  const { currencyCode: ccy } = ctx;
  return recordLedgerTransaction(
    {
      description: `Sale ${ctx.orderNumber}`,
      currencyCode: ccy,
      referenceType: 'PAYMENT',
      referenceId: ctx.orderId,
      entries: [
        { accountCode: `CASH_${ccy}`, debitMinorUnits: ctx.totalMinorUnits },
        { accountCode: `SALES_REVENUE_${ccy}`, creditMinorUnits: ctx.subtotalMinorUnits },
        { accountCode: `SHIPPING_REVENUE_${ccy}`, creditMinorUnits: ctx.shippingMinorUnits },
        { accountCode: `TAX_PAYABLE_${ccy}`, creditMinorUnits: ctx.taxMinorUnits },
      ],
    },
    prisma,
  );
}

/**
 * Reverses a recorded sale on refund/cancellation:
 *   DR  SALES_REVENUE_<CCY>     subtotal
 *   DR  SHIPPING_REVENUE_<CCY>  shipping
 *   DR  TAX_PAYABLE_<CCY>       tax
 *   CR  CASH_<CCY>              total
 */
export async function recordOrderRefund(
  ctx: OrderLedgerContext,
  prisma: PrismaClient = db,
): Promise<string> {
  const { currencyCode: ccy } = ctx;
  return recordLedgerTransaction(
    {
      description: `Refund ${ctx.orderNumber}`,
      currencyCode: ccy,
      referenceType: 'REFUND',
      referenceId: ctx.orderId,
      entries: [
        { accountCode: `SALES_REVENUE_${ccy}`, debitMinorUnits: ctx.subtotalMinorUnits },
        { accountCode: `SHIPPING_REVENUE_${ccy}`, debitMinorUnits: ctx.shippingMinorUnits },
        { accountCode: `TAX_PAYABLE_${ccy}`, debitMinorUnits: ctx.taxMinorUnits },
        { accountCode: `CASH_${ccy}`, creditMinorUnits: ctx.totalMinorUnits },
      ],
    },
    prisma,
  );
}

export interface PayoutCommissionLedgerContext {
  referenceId: string;
  currencyCode: string;
  commissionMinorUnits: bigint;
  payoutMinorUnits: bigint;
}

/**
 * Records marketplace commission + payout liability when payouts are generated:
 *   DR  COMMISSION_RECEIVABLE_<CCY>   commission
 *   CR  COMMISSION_REVENUE_<CCY>      commission
 *   DR  MERCHANT_PAYOUT_EXPENSE_<CCY> payout
 *   CR  MERCHANT_PAYOUT_PAYABLE_<CCY> payout
 */
export async function recordPayoutLedger(
  ctx: PayoutCommissionLedgerContext,
  prisma: PrismaClient = db,
): Promise<string> {
  const { currencyCode: ccy } = ctx;
  return recordLedgerTransaction(
    {
      description: 'Payout generation',
      currencyCode: ccy,
      referenceType: 'SETTLEMENT',
      referenceId: ctx.referenceId,
      entries: [
        { accountCode: `COMMISSION_RECEIVABLE_${ccy}`, debitMinorUnits: ctx.commissionMinorUnits },
        { accountCode: `COMMISSION_REVENUE_${ccy}`, creditMinorUnits: ctx.commissionMinorUnits },
        { accountCode: `MERCHANT_PAYOUT_EXPENSE_${ccy}`, debitMinorUnits: ctx.payoutMinorUnits },
        { accountCode: `MERCHANT_PAYOUT_PAYABLE_${ccy}`, creditMinorUnits: ctx.payoutMinorUnits },
      ],
    },
    prisma,
  );
}

export interface PayoutPaidContext {
  payoutId: string;
  currencyCode: string;
  payoutMinorUnits: bigint;
}

/**
 * Records the payout actually leaving the business (e.g., bank transfer sent):
 *   DR  MERCHANT_PAYOUT_PAYABLE_<CCY> payout  (clear liability)
 *   CR  CASH_<CCY>                     payout  (money leaves)
 */
export async function recordPayoutPaid(
  ctx: PayoutPaidContext,
  prisma: PrismaClient = db,
): Promise<string> {
  const { currencyCode: ccy } = ctx;
  return recordLedgerTransaction(
    {
      description: `Payout paid ${ctx.payoutId}`,
      currencyCode: ccy,
      referenceType: 'SETTLEMENT',
      referenceId: ctx.payoutId,
      entries: [
        { accountCode: `MERCHANT_PAYOUT_PAYABLE_${ccy}`, debitMinorUnits: ctx.payoutMinorUnits },
        { accountCode: `CASH_${ccy}`, creditMinorUnits: ctx.payoutMinorUnits },
      ],
    },
    prisma,
  );
}
