import { prisma as db } from '../db/prisma.js';
import type { PrismaClient } from '@prisma/client';

export interface LedgerEntryInput {
  accountCode: string;
  debitMinorUnits?: number | bigint;
  creditMinorUnits?: number | bigint;
  currencyCode?: string;
}

export interface RecordTransactionInput {
  description: string;
  referenceType?: string;
  referenceId?: string;
  entries: LedgerEntryInput[];
}

export async function recordLedgerTransaction(
  input: RecordTransactionInput,
  prisma: PrismaClient = db,
): Promise<string> {
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
  const accounts = await prisma.ledgerAccount.findMany({
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

      const created = await prisma.ledgerAccount.create({
        data: {
          code,
          name: code,
          type,
          currencyCode: 'USD',
        },
      });
      accountMap.set(code, created.id);
    }
  }

  const transactionId = await prisma.$transaction(async txClient => {
    const transaction = await txClient.ledgerTransaction.create({
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
                currencyCode: entry.currencyCode ?? 'USD',
              });
            }
            if (c > 0n) {
              results.push({
                accountId: accountMap.get(entry.accountCode)!,
                direction: 'CREDIT',
                amountMinorUnits: c,
                currencyCode: entry.currencyCode ?? 'USD',
              });
            }
            return results;
          }),
        },
      },
    });
    return transaction.id;
  });

  return transactionId;
}
