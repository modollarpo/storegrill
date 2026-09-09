import { describe, it, expect } from 'vitest';
import {
  mapCommissionRuleToShared,
  mapCommissionRulesToShared,
  type PrismaCommissionRuleInput,
} from './commission-rule-mapper.js';
import {
  computeCommission,
  selectCommissionRule,
  type CommissionInput,
} from '@Storegrill/shared';

function prismaRule(overrides: Partial<PrismaCommissionRuleInput> = {}): PrismaCommissionRuleInput {
  return {
    id: 'rule-1',
    basis: 'DEAL_PRICE',
    rateBps: 1250,
    minAmountMinorUnits: null,
    maxAmountMinorUnits: null,
    vendorId: null,
    categoryId: null,
    regionKey: null,
    priority: 0,
    startsAt: null,
    endsAt: null,
    active: true,
    ...overrides,
  };
}

const input: CommissionInput = {
  merchantId: 'v1',
  regionKey: 'UK',
  categoryId: 'c1',
  dealPriceMinorUnits: 10000n,
};

describe('mapCommissionRuleToShared', () => {
  it('maps the Prisma field names onto the shared engine shape', () => {
    const shared = mapCommissionRuleToShared(
      prismaRule({
        id: 'r1',
        vendorId: 'v1',
        basis: 'DEAL_PRICE',
        rateBps: 1500,
        minAmountMinorUnits: 100n,
        maxAmountMinorUnits: 500n,
        startsAt: new Date('2026-01-01'),
        endsAt: new Date('2026-12-31'),
        priority: 3,
      }),
    );
    expect(shared).toEqual({
      id: 'r1',
      merchantId: 'v1',
      regionKey: null,
      categoryId: null,
      basis: 'DEAL_PRICE',
      rateBps: 1500,
      minCommissionMinorUnits: 100n,
      maxCommissionMinorUnits: 500n,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-12-31'),
      priority: 3,
    });
  });

  it('returns null for inactive rules', () => {
    expect(mapCommissionRuleToShared(prismaRule({ active: false }))).toBeNull();
  });

  it('treats rules without an explicit active flag as active', () => {
    const { active: _active, ...rule } = prismaRule();
    expect(mapCommissionRuleToShared(rule)).not.toBeNull();
  });
});

describe('mapped rules now match where the raw cast never did', () => {
  it('matches a vendor-specific rule after mapping (raw Prisma row would not)', () => {
    // Raw Prisma rows carry `vendorId`; selectCommissionRule reads `merchantId`.
    // Before mapping, merchantId is undefined => vendor rule silently never matched.
    const shared = mapCommissionRuleToShared(
      prismaRule({ id: 'vendor-rule', vendorId: 'v1', basis: 'DEAL_PRICE', rateBps: 900 }),
    );
    const matched = selectCommissionRule(shared ? [shared] : [], input);
    expect(matched).not.toBeNull();
    expect(matched!.id).toBe('vendor-rule');
    expect(computeCommission(matched!, input).commissionMinorUnits).toBe(900n);
  });

  it('enforces the effective window after mapping (raw Prisma row would not)', () => {
    // Raw Prisma rows carry startsAt/endsAt; the engine reads effectiveFrom/To.
    const expired = mapCommissionRuleToShared(
      prismaRule({
        id: 'expired-rule',
        vendorId: 'v1',
        basis: 'DEAL_PRICE',
        rateBps: 500,
        startsAt: new Date('2020-01-01'),
        endsAt: new Date('2021-01-01'),
      }),
    );
    // asOf is 2026 via input.default; Date.now() is mocked-free here, rule is expired.
    const matched = selectCommissionRule(expired ? [expired] : [], { ...input, asOf: new Date('2026-06-01') });
    expect(matched).toBeNull();
  });

  it('applies min/max commission clamping after mapping', () => {
    const shared = mapCommissionRuleToShared(
      prismaRule({ vendorId: 'v1', basis: 'DEAL_PRICE', rateBps: 100, minAmountMinorUnits: 500n }),
    );
    const matched = selectCommissionRule(shared ? [shared] : [], input);
    const result = computeCommission(matched!, input);
    expect(result.commissionMinorUnits).toBe(500n);
  });
});

describe('mapCommissionRulesToShared', () => {
  it('drops inactive and empty results', () => {
    const mapped = mapCommissionRulesToShared([
      prismaRule({ id: 'a', active: true }),
      prismaRule({ id: 'b', active: false }),
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]!.id).toBe('a');
  });
});
