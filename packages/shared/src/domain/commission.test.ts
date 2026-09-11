import { describe, it, expect } from 'vitest';
import { selectCommissionRule, computeCommission, CommissionBasis, type CommissionRule, type CommissionInput } from './commission';

const baseRule: CommissionRule = {
  id: 'rule-1',
  merchantId: 'v1',
  basis: CommissionBasis.DEAL_PRICE,
  rateBps: 1250,
};

const baseInput: CommissionInput = {
  merchantId: 'v1',
  regionKey: 'UK',
  categoryId: 'c1',
  dealPriceMinorUnits: 10000n,
};

describe('selectCommissionRule — effective-dated filtering', () => {
  it('includes a rule whose window is currently open', () => {
    const rule: CommissionRule = {
      ...baseRule,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2027-12-31'),
    };
    expect(selectCommissionRule([rule], baseInput)).toEqual(rule);
  });

  it('excludes a rule whose effectiveFrom is in the future', () => {
    const rule: CommissionRule = {
      ...baseRule,
      effectiveFrom: new Date('2099-01-01'),
    };
    expect(selectCommissionRule([rule], baseInput)).toBeNull();
  });

  it('excludes a rule whose effectiveTo is in the past', () => {
    const rule: CommissionRule = {
      ...baseRule,
      effectiveFrom: new Date('2020-01-01'),
      effectiveTo: new Date('2021-12-31'),
    };
    expect(selectCommissionRule([rule], baseInput)).toBeNull();
  });

  it('uses the asOf parameter for historical lookups', () => {
    const past: CommissionRule = {
      ...baseRule,
      id: 'old',
      effectiveFrom: new Date('2020-01-01'),
      effectiveTo: new Date('2022-12-31'),
    };
    const future: CommissionRule = {
      ...baseRule,
      id: 'new',
      effectiveFrom: new Date('2023-01-01'),
    };
    const asOf = new Date('2021-06-15');
    const matched = selectCommissionRule([past, future], { ...baseInput, asOf });
    expect(matched?.id).toBe('old');
  });
});

describe('computeCommission — guardrails', () => {
  it('clamps to minCommissionMinorUnits', () => {
    const rule: CommissionRule = {
      ...baseRule,
      rateBps: 100,
      minCommissionMinorUnits: 500n,
    };
    const result = computeCommission(rule, baseInput);
    expect(result.commissionMinorUnits).toBe(500n);
  });

  it('clamps to maxCommissionMinorUnits', () => {
    const rule: CommissionRule = {
      ...baseRule,
      rateBps: 5000,
      maxCommissionMinorUnits: 2000n,
    };
    const result = computeCommission(rule, baseInput);
    expect(result.commissionMinorUnits).toBe(2000n);
  });

  it('respects both min and max clamp', () => {
    const rule: CommissionRule = {
      ...baseRule,
      rateBps: 1250,
      minCommissionMinorUnits: 500n,
      maxCommissionMinorUnits: 1500n,
    };
    const result = computeCommission(rule, baseInput);
    expect(result.commissionMinorUnits).toBe(1250n);
  });
});
