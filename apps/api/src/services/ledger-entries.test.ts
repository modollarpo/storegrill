import { describe, it, expect, vi } from 'vitest';
import { recordOrderSale, recordOrderRefund, recordPayoutLedger } from './ledger-entries.js';

function captureRecording() {
  const recordings: Array<{ entries: { create: Array<Record<string, unknown>> }; referenceId?: string; referenceType?: string }> = [];
  const txClient = {
    ledgerTransaction: {
      create: vi.fn(async (args: { data: { entries: { create: Array<Record<string, unknown>> }; referenceId?: string; referenceType?: string } }) => {
        recordings.push(args.data);
        return { id: 'tx' };
      }),
    },
  };
  const prisma = {
    ledgerAccount: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'acct', ...args.data })),
    },
    ledgerTransaction: { create: txClient.ledgerTransaction.create },
    $transaction: vi.fn(async (fn: (c: unknown) => unknown) => fn(txClient)),
  } as never;
  return { prisma, recordings, txClient };
}

function entriesOf(recorded: { entries: { create: Array<Record<string, unknown>> } }): Array<Record<string, unknown>> {
  return recorded.entries.create;
}
describe('recordOrderSale', () => {
  it('records a balanced sale in the order currency', async () => {
    const { prisma, recordings } = captureRecording();
    const id = await recordOrderSale(
      {
        orderId: 'o1',
        orderNumber: 'SG-1',
        currencyCode: 'GBP',
        subtotalMinorUnits: 1000n,
        taxMinorUnits: 200n,
        shippingMinorUnits: 300n,
        totalMinorUnits: 1500n,
      },
      prisma,
    );
    expect(id).toBe('tx');
    expect(recordings).toHaveLength(1);
    const entries = entriesOf(recordings[0]);
    const debit = entries.filter(e => e.direction === 'DEBIT');
    const credit = entries.filter(e => e.direction === 'CREDIT');
    const debitSum = debit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    const creditSum = credit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    expect(debitSum).toBe(creditSum);
    expect(debitSum).toBe(1500);
    expect(entries.every(e => e.currencyCode === 'GBP')).toBe(true);
    expect(recordings[0].referenceId).toBe('o1');
    expect(recordings[0].referenceType).toBe('PAYMENT');
  });
});

describe('recordOrderRefund', () => {
  it('reverses the sale with balanced entries in the order currency', async () => {
    const { prisma, recordings } = captureRecording();
    await recordOrderRefund(
      {
        orderId: 'o1',
        orderNumber: 'SG-1',
        currencyCode: 'EUR',
        subtotalMinorUnits: 1000n,
        taxMinorUnits: 200n,
        shippingMinorUnits: 300n,
        totalMinorUnits: 1500n,
      },
      prisma,
    );
    const entries = entriesOf(recordings[0]);
    const debit = entries.filter(e => e.direction === 'DEBIT');
    const credit = entries.filter(e => e.direction === 'CREDIT');
    const debitSum = debit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    const creditSum = credit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    expect(debitSum).toBe(creditSum);
    expect(entries.every(e => e.currencyCode === 'EUR')).toBe(true);
    expect(recordings[0].referenceType).toBe('REFUND');
  });
});

describe('recordPayoutLedger', () => {
  it('records commission revenue and payout payable', async () => {
    const { prisma, recordings } = captureRecording();
    await recordPayoutLedger(
      {
        referenceId: 'payout-1',
        currencyCode: 'USD',
        commissionMinorUnits: 1200n,
        payoutMinorUnits: 8770n,
      },
      prisma,
    );
    const entries = entriesOf(recordings[0]);
    const debit = entries.filter(e => e.direction === 'DEBIT');
    const credit = entries.filter(e => e.direction === 'CREDIT');
    const debitSum = debit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    const creditSum = credit.reduce((s, e) => s + Number(e.amountMinorUnits), 0);
    expect(debitSum).toBe(creditSum);
    expect(debitSum).toBe(1200 + 8770);
    expect(entries.length).toBe(4);
    expect(entries.every(e => e.currencyCode === 'USD')).toBe(true);
  });
});
