import { describe, it, expect } from 'vitest';
import {
  resolveCommissionFromRules,
  snapshotToJson,
  type CommissionSnapshotInput,
} from './commission-snapshot.js';
import { CommissionBasis, type CommissionRule } from '@Storegrill/shared';

function merchantRule(overrides: Partial<CommissionRule> = {}): CommissionRule {
  return {
    id: 'rule-1',
    merchantId: 'v1',
    basis: CommissionBasis.DEAL_PRICE,
    rateBps: 1250,
    ...overrides,
  };
}

const baseInput: CommissionSnapshotInput = {
  merchantId: 'v1',
  regionKey: 'UK',
  categoryId: 'c1',
  dealPriceMinorUnits: 10000n,
};

describe('resolveCommissionFromRules', () => {
  it('returns null when no rules match', () => {
    expect(resolveCommissionFromRules([], baseInput)).toBeNull();
  });

  it('resolves a DEAL_PRICE commission and snapshot', () => {
    const result = resolveCommissionFromRules([merchantRule()], baseInput);
    expect(result).not.toBeNull();
    expect(result!.commissionMinorUnits).toBe(1250n);
    expect(result!.ruleId).toBe('rule-1');
    expect(result!.snapshot.basis).toBe(CommissionBasis.DEAL_PRICE);
    expect(result!.snapshot.rateBps).toBe(1250);
    expect(result!.snapshot.applicableAmountMinorUnits).toBe(10000n);
  });

  it('selects the more specific merchant rule over a global rule', () => {
    const result = resolveCommissionFromRules(
      [
        { id: 'global', basis: CommissionBasis.DEAL_PRICE, rateBps: 500 },
        merchantRule({ id: 'specific', rateBps: 900, basis: CommissionBasis.DEAL_PRICE, merchantId: 'v1' }),
      ],
      baseInput,
    );
    expect(result!.ruleId).toBe('specific');
    expect(result!.commissionMinorUnits).toBe(900n);
  });

  it('uses shippingMinorUnits for GROSS_ORDER basis', () => {
    const result = resolveCommissionFromRules(
      [merchantRule({ basis: CommissionBasis.GROSS_ORDER, rateBps: 1000 })],
      { ...baseInput, shippingMinorUnits: 500n, taxMinorUnits: 400n },
    );
    expect(result!.commissionMinorUnits).toBe(1090n);
  });

  it('clamps commission to maxCommissionMinorUnits', () => {
    const result = resolveCommissionFromRules(
      [merchantRule({ maxCommissionMinorUnits: 500n })],
      baseInput,
    );
    expect(result!.commissionMinorUnits).toBe(500n);
  });
});

describe('snapshotToJson', () => {
  it('serializes bigint fields as strings for JSON-safe storage', () => {
    const json = snapshotToJson({
      ruleId: 'rule-1',
      basis: CommissionBasis.DEAL_PRICE,
      rateBps: 1250,
      applicableAmountMinorUnits: 10000n,
      commissionMinorUnits: 1250n,
      minCommissionMinorUnits: null,
      maxCommissionMinorUnits: 5000n,
    });
    const parsed = JSON.parse(json);
    expect(parsed.applicableAmountMinorUnits).toBe('10000');
    expect(parsed.commissionMinorUnits).toBe('1250');
    expect(parsed.maxCommissionMinorUnits).toBe('5000');
    expect(parsed.minCommissionMinorUnits).toBeNull();
    expect(parsed.basis).toBe(CommissionBasis.DEAL_PRICE);
  });
});
