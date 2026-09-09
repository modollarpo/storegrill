import { describe, it, expect } from 'vitest';
import { computeGroupPayout } from './payouts.js';
import { percentOf } from '@Storegrill/shared';

const items = (overrides: Array<Partial<{ totalMinorUnits: number; commissionMinorUnits: number }>>) =>
  overrides.map((o, i) => ({
    id: `item-${i}`,
    totalMinorUnits: 10000,
    commissionMinorUnits: -1,
    ...o,
  }));

describe('computeGroupPayout', () => {
  const baseInput = {
    revenueSharePct: 12,
    fixedFeeMinorUnits: 30,
    currencyCode: 'GBP',
  };

  it('uses the order-time commission snapshot when present (immutable), not today rate', () => {
    const result = computeGroupPayout({
      items: items([{ commissionMinorUnits: 2500 }]),
      ...baseInput,
    });
    expect(result.lines[0].commission).toBe(2500);
    expect(result.lines[0].payoutAmount).toBe(10000 - 2500 - 30);
  });

  it('falls back to the vendor revenue share in basis-point integer math for legacy items', () => {
    const result = computeGroupPayout({
      items: items([{ commissionMinorUnits: -1 }]),
      ...baseInput,
    });
    const expected = Number(percentOf(10000n, 1200));
    expect(result.lines[0].commission).toBe(expected);
    expect(result.totalCommissionMinorUnits).toBe(expected);
  });

  it('aggregates mixed snapshot and fallback items without drifting totals', () => {
    const result = computeGroupPayout({
      items: items([
        { commissionMinorUnits: 2500 },
        { commissionMinorUnits: -1 },
      ]),
      ...baseInput,
    });
    const fallback = Number(percentOf(10000n, 1200));
    expect(result.totalCommissionMinorUnits).toBe(2500 + fallback);
    expect(result.totalFixedFeesMinorUnits).toBe(60);
    expect(result.totalPayoutMinorUnits).toBe((10000 - 2500 - 30) + (10000 - fallback - 30));
    expect(result.lines).toHaveLength(2);
  });

  it('handles fractional default rates without float money (12.5% → 1250bps)', () => {
    const result = computeGroupPayout({
      items: items([{ commissionMinorUnits: -1 }]),
      ...baseInput,
      revenueSharePct: 12.5,
    });
    expect(result.lines[0].commission).toBe(Number(percentOf(10000n, 1250)));
    expect(result.lines[0].payoutAmount).toBe(10000 - Number(percentOf(10000n, 1250)) - 30);
  });

  it('clamps tiny-item payouts at zero but still records the fee', () => {
    const result = computeGroupPayout({
      items: items([{ totalMinorUnits: 10, commissionMinorUnits: -1 }]),
      ...baseInput,
    });
    expect(result.lines[0].payoutAmount).toBe(0);
    expect(result.lines[0].fixedFee).toBe(30);
    expect(result.totalFixedFeesMinorUnits).toBe(30);
  });
});