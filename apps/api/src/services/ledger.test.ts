import { describe, it, expect, vi } from 'vitest';
import { recordLedgerTransaction } from './ledger.js';
import type { PrismaClient } from '@prisma/client';

function mockPrisma(overrides: Partial<Record<keyof PrismaClient, unknown>> = {}) {
  const accounts: Array<Record<string, unknown>> = [];
  const transactions: Array<{ referenceType?: string; referenceId?: string; entries: { create: Array<Record<string, unknown>> } }> = [];
  const txClient = {
    ledgerTransaction: {
      create: vi.fn(async (args: { data: { referenceType?: string; referenceId?: string; entries: { create: Array<Record<string, unknown>> } } }) => {
        transactions.push(args.data);
        return { id: 'tx-1' };
      }),
    },
  };
  return {
    ledgerAccount: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        accounts.push(args.data);
        return { id: `acct-${accounts.length}`, ...args.data };
      }),
    },
    ledgerTransaction: {
      create: vi.fn(async (args: { data: { referenceType?: string; referenceId?: string; entries: { create: Array<Record<string, unknown>> } } }) => {
        transactions.push(args.data);
        return { id: 'tx-1' };
      }),
    },
    $transaction: vi.fn(async (fn: (c: unknown) => unknown) => fn(txClient)),
    __transactions: transactions,
    ...overrides,
  } as unknown as PrismaClient & {
    ledgerAccount: { create: ReturnType<typeof vi.fn> };
    ledgerTransaction: { create: ReturnType<typeof vi.fn> };
    __transactions: Array<{ referenceType?: string; referenceId?: string; entries: { create: Array<Record<string, unknown>> } }>;
  };
}

describe('ledger service', () => {
  it('rejects unbalanced double-entry transactions', async () => {
    await expect(
      recordLedgerTransaction({
        description: 'Unbalanced test',
        currencyCode: 'GBP',
        entries: [
          { accountCode: 'CASH', debitMinorUnits: 1000 },
          { accountCode: 'REVENUE', creditMinorUnits: 900 },
        ],
      })
    ).rejects.toThrow(/Double-entry imbalance/);
  });

  it('rejects negative amounts', async () => {
    await expect(
      recordLedgerTransaction({
        description: 'Negative test',
        currencyCode: 'GBP',
        entries: [
          { accountCode: 'CASH', debitMinorUnits: -1000 },
          { accountCode: 'REVENUE', creditMinorUnits: -1000 },
        ],
      })
    ).rejects.toThrow(/Ledger amounts cannot be negative/);
  });

  it('records a balanced transaction using the transaction-level currency', async () => {
    const prisma = mockPrisma();
    const id = await recordLedgerTransaction(
      {
        description: 'Sale',
        currencyCode: 'GBP',
        referenceType: 'PAYMENT',
        referenceId: 'order-1',
        entries: [
          { accountCode: 'CASH', debitMinorUnits: 1000 },
          { accountCode: 'REVENUE', creditMinorUnits: 1000 },
        ],
      },
      prisma,
    );

    expect(id).toBe('tx-1');
    const createArgs = prisma.__transactions[0];
    expect(createArgs.referenceType).toBe('PAYMENT');
    expect(createArgs.referenceId).toBe('order-1');
    const createdEntries = createArgs.entries.create;
    expect(createdEntries).toEqual([
      expect.objectContaining({ direction: 'DEBIT', amountMinorUnits: 1000n, currencyCode: 'GBP', accountId: 'acct-1' }),
      expect.objectContaining({ direction: 'CREDIT', amountMinorUnits: 1000n, currencyCode: 'GBP', accountId: 'acct-2' }),
    ]);
  });

  it('auto-created accounts use the transaction currency, not a USD default', async () => {
    const prisma = mockPrisma();
    await recordLedgerTransaction(
      {
        description: 'Sale',
        currencyCode: 'JPY',
        entries: [
          { accountCode: 'BANK', debitMinorUnits: 5000 },
          { accountCode: 'REVENUE', creditMinorUnits: 5000 },
        ],
      },
      prisma,
    );

    const createdAccounts = prisma.ledgerAccount.create.mock.calls.map(c => c[0].data);
    expect(createdAccounts).toHaveLength(2);
    for (const account of createdAccounts) {
      expect(account.currencyCode).toBe('JPY');
    }
    expect(createdAccounts.map(a => a.type)).toContain('ASSET');
    expect(createdAccounts.map(a => a.type)).toContain('REVENUE');
  });

  it('throws when no currencyCode is supplied', async () => {
    const prisma = mockPrisma();
    await expect(
      recordLedgerTransaction(
        {
          description: 'Sale',
          entries: [
            { accountCode: 'BANK', debitMinorUnits: 500 },
            { accountCode: 'REVENUE', creditMinorUnits: 500 },
          ],
        } as never,
        prisma,
      )
    ).rejects.toThrow();
  });

  it('per-entry currencyCode overrides the transaction currency', async () => {
    const prisma = mockPrisma();
    await recordLedgerTransaction(
      {
        description: 'Cross-currency',
        currencyCode: 'GBP',
        entries: [
          { accountCode: 'BANK', debitMinorUnits: 100, currencyCode: 'EUR' },
          { accountCode: 'REVENUE', creditMinorUnits: 100 },
        ],
      },
      prisma,
    );
    const createdEntries = prisma.__transactions[0].entries.create;
    const debit = createdEntries.find((e: Record<string, unknown>) => e.direction === 'DEBIT') as { currencyCode: string };
    const credit = createdEntries.find((e: Record<string, unknown>) => e.direction === 'CREDIT') as { currencyCode: string };
    expect(debit.currencyCode).toBe('EUR');
    expect(credit.currencyCode).toBe('GBP');
  });
});
