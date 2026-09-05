/**
 * Settlement policies and lifecycle.
 * Funds are held "pending settlement conditions" (not claimed to be escrow).
 * Policy types determine when a merchant's held balance becomes payable.
 */

export const SettlementPolicyType = {
  DELIVERY_VERIFIED: 'DELIVERY_VERIFIED',
  CUSTOMER_CONFIRMED: 'CUSTOMER_CONFIRMED',
  FIXED_DAYS_AFTER_DELIVERY: 'FIXED_DAYS_AFTER_DELIVERY',
  MANUAL_RELEASE: 'MANUAL_RELEASE',
} as const;

export type SettlementPolicyTypeValue = (typeof SettlementPolicyType)[keyof typeof SettlementPolicyType];

export interface SettlementPolicy {
  type: SettlementPolicyTypeValue;
  /** For FIXED_DAYS_AFTER_DELIVERY. */
  fixedDaysAfterDelivery?: number | null;
  /** Optional additional bearing days once eligible. */
  holdDaysAfterEligible?: number | null;
}

export const SettlementBalanceState = {
  HELD: 'HELD',
  SETTLEMENT_ELIGIBLE: 'SETTLEMENT_ELIGIBLE',
  HOLD_PERIOD: 'HOLD_PERIOD',
  PAYABLE: 'PAYABLE',
  PAID: 'PAID',
  REVERSED: 'REVERSED',
} as const;

export type SettlementBalanceStateValue = (typeof SettlementBalanceState)[keyof typeof SettlementBalanceState];

export const SettlementTransition = {
  HELD_ELIGIBLE: 'HELD_ELIGIBLE',
  ELIGIBLE_PROGRESS: 'ELIGIBLE_PROGRESS',
  HOLD_PAYABLE: 'HOLD_PAYABLE',
  PAYABLE_PAID: 'PAYABLE_PAID',
  ANY_REVERSED: 'ANY_REVERSED',
} as const;

export type SettlementTransitionValue = (typeof SettlementTransition)[keyof typeof SettlementTransition];

const SETTLEMENT_TRANSITIONS: Record<
  SettlementBalanceStateValue,
  readonly { via: SettlementTransitionValue; to: SettlementBalanceStateValue }[]
> = {
  [SettlementBalanceState.HELD]: [
    { via: SettlementTransition.HELD_ELIGIBLE, to: SettlementBalanceState.SETTLEMENT_ELIGIBLE },
    { via: SettlementTransition.ANY_REVERSED, to: SettlementBalanceState.REVERSED },
  ],
  [SettlementBalanceState.SETTLEMENT_ELIGIBLE]: [
    { via: SettlementTransition.ELIGIBLE_PROGRESS, to: SettlementBalanceState.HOLD_PERIOD },
    { via: SettlementTransition.ANY_REVERSED, to: SettlementBalanceState.REVERSED },
  ],
  [SettlementBalanceState.HOLD_PERIOD]: [
    { via: SettlementTransition.HOLD_PAYABLE, to: SettlementBalanceState.PAYABLE },
    { via: SettlementTransition.ANY_REVERSED, to: SettlementBalanceState.REVERSED },
  ],
  [SettlementBalanceState.PAYABLE]: [
    { via: SettlementTransition.PAYABLE_PAID, to: SettlementBalanceState.PAID },
    { via: SettlementTransition.ANY_REVERSED, to: SettlementBalanceState.REVERSED },
  ],
  [SettlementBalanceState.PAID]: [{ via: SettlementTransition.ANY_REVERSED, to: SettlementBalanceState.REVERSED }],
  [SettlementBalanceState.REVERSED]: [],
};

export function settleStateForTransition(
  from: SettlementBalanceStateValue,
  via: SettlementTransitionValue,
): SettlementBalanceStateValue | null {
  const allowed = SETTLEMENT_TRANSITIONS[from] ?? [];
  const hit = allowed.find(t => t.via === via);
  return hit ? hit.to : null;
}

export function canTransitionSettlement(
  from: SettlementBalanceStateValue,
  transition: SettlementTransitionValue,
): boolean {
  return settleStateForTransition(from, transition) != null;
}

export interface SettlementEligibilityInput {
  policy: SettlementPolicy;
  deliveredAt?: Date | null;
  confirmedAt?: Date | null;
  asOf?: Date;
}

export interface SettlementEligibilityResult {
  eligible: boolean;
  eligibleAt: Date | null;
  reason: string;
}

/**
 * Computes when a settlement becomes eligible for a held balance.
 * MANUAL_RELEASE is never auto-eligible; CUSTOMER_CONFIRMED requires the
 * buyer to confirm receipt; DELIVERY_VERIFIED requires a verified delivery
 * timestamp; FIXED_DAYS_AFTER_DELIVERY adds a configured holding period.
 */
export function computeSettlementEligibility(input: SettlementEligibilityInput): SettlementEligibilityResult {
  const asOf = input.asOf ?? new Date();
  const { policy } = input;

  let eligibleAt: Date | null = null;
  switch (policy.type) {
    case 'DELIVERY_VERIFIED':
      if (!input.deliveredAt) {
        return { eligible: false, eligibleAt: null, reason: 'Delivery has not been verified yet' };
      }
      eligibleAt = input.deliveredAt;
      break;

    case 'CUSTOMER_CONFIRMED':
      if (!input.confirmedAt) {
        return { eligible: false, eligibleAt: null, reason: 'Pending customer confirmation of receipt' };
      }
      eligibleAt = input.confirmedAt;
      break;

    case 'FIXED_DAYS_AFTER_DELIVERY': {
      const days = policy.fixedDaysAfterDelivery ?? 0;
      if (!input.deliveredAt) {
        return { eligible: false, eligibleAt: null, reason: 'Delivery has not been verified yet' };
      }
      eligibleAt = addDays(input.deliveredAt, days);
      break;
    }

    case 'MANUAL_RELEASE':
      return { eligible: false, eligibleAt: null, reason: 'Requires manual release by platform finance' };

    default:
      return { eligible: false, eligibleAt: null, reason: 'Unknown settlement policy' };
  }

  const holdDays = policy.holdDaysAfterEligible ?? 0;
  if (holdDays > 0) {
    eligibleAt = addDays(eligibleAt, holdDays);
  }

  return {
    eligible: asOf >= eligibleAt,
    eligibleAt,
    reason: `Eligible for settlement on ${eligibleAt.toISOString()}`,
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}