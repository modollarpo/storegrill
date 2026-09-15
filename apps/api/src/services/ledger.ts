import { prisma as db } from '../db/prisma.js';
import type { Prisma, PrismaClient } from '@prisma/client';

export type LedgerClient = PrismaClient | Prisma.TransactionClient;

export interface LedgerEntryInput {
  accountCode: string;
  debitMinorUnits?: number | bigint;
  creditMinorUnits?: number | bigint;
  currencyCode?: string;
}

export interface RecordTransactionInput {
  description: string;
  currencyCode: string;
  referenceType?: string;
  referenceId?: string;
  entries: LedgerEntryInput[];
}

/**
 * Posts a balanced double-entry transaction. Composable: accepts either the
 * module Prisma client or a caller's interactive transaction client, so callers
 * can make the ledger post atomic with the write it settles (order creation,
 * payout generation, payout paid). The account ensure + transaction + nested
 * entries are a single atomic write — no inner interactive transaction — so it
 * is safe to call inside a surrounding $transaction callback.
 */
export async function recordLedgerTransaction(
  input: RecordTransactionInput,
  client: LedgerClient = db,
): Promise<string> {
  if (!input.currencyCode) {
    throw new Error('Ledger transaction requires a currencyCode');
  }

  let totalDebit = 0n;
  let totalCredit = 0n;

  for (const entry of input.entries) {
    const d = BigInt(entry.debitMinorUnits ?? 0n);
    const c = BigInt(entry.creditMinorUnits ?? 0n);
    if (d < 0n || c < 0n) throw new Error('Ledger amounts cannot be negative');
    if (d > 0n && c > 0n) throw new Error('An entry cannot have both debit and credit');
    totalDebit += d;
    totalCredit += c;
  }

  if (totalDebit !== totalCredit) {
    throw new Error(`Double-entry imbalance: total debits (${totalDebit}) must equal total credits (${totalCredit})`);
  }

  const accountCodes = [...new Set(input.entries.map(e => e.accountCode))];
  const accounts = await client.ledgerAccount.findMany({
    where: { code: { in: accountCodes } },
  });
  const accountMap = new Map(accounts.map(a => [a.code, a.id]));

  for (const code of accountCodes) {
    if (!accountMap.has(code)) {
      const type = code.includes('CASH') || code.includes('BANK') || code.includes('RECEIVABLE')
        ? 'ASSET'
        : code.includes('PAYABLE') || code.includes('LIABILITY')
          ? 'LIABILITY'
          : code.includes('REV') || code.includes('FEE')
            ? 'REVENUE'
            : 'EXPENSE';

      const account = await client.ledgerAccount.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: code,
          type,
          currencyCode: input.currencyCode,
        },
      });
      accountMap.set(code, account.id);
    }
  }

  const transaction = await client.ledgerTransaction.create({
    data: {
      description: input.description,
      referenceType: input.referenceType ?? 'PAYMENT',
      referenceId: input.referenceId,
      entries: {
        create: input.entries.flatMap(entry => {
          const d = BigInt(entry.debitMinorUnits ?? 0n);
          const c = BigInt(entry.creditMinorUnits ?? 0n);
          const results = [];
          if (d > 0n) {
            results.push({
              accountId: accountMap.get(entry.accountCode)!,
              direction: 'DEBIT',
              amountMinorUnits: d,
              currencyCode: entry.currencyCode ?? input.currencyCode,
            });
          }
          if (c > 0n) {
            results.push({
              accountId: accountMap.get(entry.accountCode)!,
              direction: 'CREDIT',
              amountMinorUnits: c,
              currencyCode: entry.currencyCode ?? input.currencyCode,
            });
          }
          return results;
        }),
      },
    },
  });

  return transaction.id;
}
