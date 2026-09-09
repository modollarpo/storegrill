import { describe, it, expect } from 'vitest';
import { calculatePayout } from './payout-engine.js';
import { percentOf } from './utils/money.js';

describe('calculatePayout', () => {
  const terms = { revenueShareBps: 1200, fixedFeeMinorUnits: 30, currencyCode: 'USD' };

  it('deducts basis-point commission and fixed fee per item', () => {
    const result = calculatePayout([{ id: 'i1', amountMinorUnits: 10000 }], terms);
    expect(result.lines[0]).toEqual({
      orderItemId: 'i1',
      itemAmount: 10000,
      commission: 1200,
      fixedFee: 30,
      payoutAmount: 8770,
    });
    expect(result.totalPayoutMinorUnits).toBe(8770);
    expect(result.totalCommissionMinorUnits).toBe(1200);
    expect(result.totalFixedFeesMinorUnits).toBe(30);
  });

  it('aggregates multiple items across commission, fees and payout', () => {
    const result = calculatePayout([
      { id: 'i1', amountMinorUnits: 10000 },
      { id: 'i2', amountMinorUnits: 5000 },
    ], terms);
    expect(result.totalCommissionMinorUnits).toBe(1200 + 600);
    expect(result.totalFixedFeesMinorUnits).toBe(60);
    expect(result.totalPayoutMinorUnits).toBe(8770 + (5000 - 600 - 30));
    expect(result.lines).toHaveLength(2);
  });

  it('never produces a negative payout on tiny items', () => {
    const result = calculatePayout([{ id: 'i1', amountMinorUnits: 10 }], terms);
    expect(result.lines[0].payoutAmount).toBe(0);
    expect(result.totalPayoutMinorUnits).toBe(0);
  });

  it('uses half-up integer percentOf rounding — never float arithmetic', () => {
    const result = calculatePayout([{ id: 'i1', amountMinorUnits: 3333 }], terms);
    const expectedCommission = Number(percentOf(3333n, 1200));
    expect(result.lines[0].commission).toBe(expectedCommission);
    expect(result.totalPayoutMinorUnits).toBe(3333 - expectedCommission - 30);
  });

  it('uses the order-time commission override when present (immutable snapshot)', () => {
    const result = calculatePayout(
      [{ id: 'i1', amountMinorUnits: 10000, commissionOverrideMinorUnits: 2500 }],
      { revenueShareBps: 1200, fixedFeeMinorUnits: 30, currencyCode: 'USD' },
    );
    expect(result.lines[0].commission).toBe(2500);
    expect(result.lines[0].payoutAmount).toBe(10000 - 2500 - 30);
  });

  it('ignores a null override and falls back to revenue share', () => {
    const result = calculatePayout(
      [{ id: 'i1', amountMinorUnits: 10000, commissionOverrideMinorUnits: undefined }],
      terms,
    );
    expect(result.lines[0].commission).toBe(1200);
  });

  it('returns zero totals for no items', () => {
    const result = calculatePayout([], terms);
    expect(result.lines).toEqual([]);
    expect(result.totalPayoutMinorUnits).toBe(0);
    expect(result.totalCommissionMinorUnits).toBe(0);
    expect(result.totalFixedFeesMinorUnits).toBe(0);
  });
});