import { describe, it, expect } from 'vitest';
import { recordLedgerTransaction } from './ledger.js';

describe('ledger service', () => {
  it('rejects unbalanced double-entry transactions', async () => {
    await expect(
      recordLedgerTransaction({
        description: 'Unbalanced test',
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
        entries: [
          { accountCode: 'CASH', debitMinorUnits: -1000 },
          { accountCode: 'REVENUE', creditMinorUnits: -1000 },
        ],
      })
    ).rejects.toThrow(/Ledger amounts cannot be negative/);
  });
});
