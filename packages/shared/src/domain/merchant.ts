export const MerchantStatus = {
  DRAFT: 'DRAFT',
  APPLICATION: 'APPLICATION',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  RESTRICTED: 'RESTRICTED',
  TERMINATED: 'TERMINATED',
  REJECTED: 'REJECTED',
} as const;

export type MerchantStatusValue = (typeof MerchantStatus)[keyof typeof MerchantStatus];

export const MERCHANT_STATUS_PROPOSED: readonly [MerchantStatusValue, ...MerchantStatusValue[]] = [
  MerchantStatus.DRAFT,
  MerchantStatus.APPLICATION,
  MerchantStatus.UNDER_REVIEW,
  MerchantStatus.VERIFIED,
  MerchantStatus.ACTIVE,
];

export const MERCHANT_STATUS_VALUES: readonly MerchantStatusValue[] = [
  MerchantStatus.DRAFT,
  MerchantStatus.APPLICATION,
  MerchantStatus.UNDER_REVIEW,
  MerchantStatus.VERIFIED,
  MerchantStatus.ACTIVE,
  MerchantStatus.SUSPENDED,
  MerchantStatus.RESTRICTED,
  MerchantStatus.TERMINATED,
  MerchantStatus.REJECTED,
];

/**
 * Adjacency map of legal status transitions. Anything not listed is rejected.
 * TERMINATED is terminal; SUSPENDED/RESTRICTED fold back to ACTIVE only after
 * an explicit admin review decision.
 */
const MERCHANT_TRANSITIONS: Record<MerchantStatusValue, readonly MerchantStatusValue[]> = {
  [MerchantStatus.DRAFT]: [MerchantStatus.APPLICATION],
  [MerchantStatus.APPLICATION]: [MerchantStatus.UNDER_REVIEW, MerchantStatus.REJECTED],
  [MerchantStatus.UNDER_REVIEW]: [MerchantStatus.VERIFIED, MerchantStatus.SUSPENDED, MerchantStatus.RESTRICTED],
  [MerchantStatus.VERIFIED]: [MerchantStatus.ACTIVE, MerchantStatus.SUSPENDED],
  [MerchantStatus.ACTIVE]: [MerchantStatus.SUSPENDED, MerchantStatus.RESTRICTED, MerchantStatus.TERMINATED],
  [MerchantStatus.SUSPENDED]: [MerchantStatus.ACTIVE, MerchantStatus.RESTRICTED, MerchantStatus.TERMINATED],
  [MerchantStatus.RESTRICTED]: [MerchantStatus.ACTIVE, MerchantStatus.SUSPENDED, MerchantStatus.TERMINATED],
  [MerchantStatus.REJECTED]: [],
  [MerchantStatus.TERMINATED]: [],
};

export function canTransitionMerchantStatus(from: MerchantStatusValue, to: MerchantStatusValue): boolean {
  if (from === to) return false;
  const allowed = MERCHANT_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export const REQUIRED_KYC_FOR_PROGRESS: Record<MerchantStatusValue, boolean> = {
  [MerchantStatus.DRAFT]: false,
  [MerchantStatus.APPLICATION]: false,
  [MerchantStatus.UNDER_REVIEW]: true,
  [MerchantStatus.VERIFIED]: true,
  [MerchantStatus.ACTIVE]: true,
  [MerchantStatus.SUSPENDED]: false,
  [MerchantStatus.RESTRICTED]: false,
  [MerchantStatus.REJECTED]: false,
  [MerchantStatus.TERMINATED]: false,
};

/** Idempotent guard: returns why a transition is disallowed, or null if legal. */
export function validateMerchantTransition(from: MerchantStatusValue, to: MerchantStatusValue, kycVerified = false): string | null {
  if (!MERCHANT_STATUS_VALUES.includes(to)) return `Unknown target status: ${to}`;
  if (!canTransitionMerchantStatus(from, to)) return `Cannot move merchant from ${from} to ${to}`;
  if (REQUIRED_KYC_FOR_PROGRESS[to] && !kycVerified) {
    return 'KYC verification must be complete before the merchant can advance to this status';
  }
  return null;
}

export const MerchantRole = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  OPERATIONS_ADMIN: 'OPERATIONS_ADMIN',
  MARKETING_ADMIN: 'MARKETING_ADMIN',
  SUPPORT: 'SUPPORT',
  MERCHANT_OWNER: 'MERCHANT_OWNER',
  MERCHANT_MANAGER: 'MERCHANT_MANAGER',
  MERCHANT_FULFILMENT: 'MERCHANT_FULFILMENT',
  CUSTOMER: 'CUSTOMER',
} as const;

export type MerchantRoleValue = (typeof MerchantRole)[keyof typeof MerchantRole];

export const MERCHANT_ROLE_VALUES: readonly MerchantRoleValue[] = Object.values(MerchantRole);

export const MerchantPermission = {
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  DEAL_CREATE: 'deal:create',
  DEAL_APPROVE: 'deal:approve',
  FULFILMENT_UPDATE: 'fulfilment:update',
  FULFILMENT_READ: 'fulfilment:read',
  MARKETING_OPT_IN: 'marketing:opt-in',
  MARKETING_CREATE: 'marketing:create',
  FINANCE_READ: 'finance:read',
  PAYOUTS_APPROVE: 'payouts:approve',
  PAYOUTS_VIEW: 'payouts:view',
  SETTLEMENT_APPROVE: 'settlement:approve',
  AUDIT_READ: 'audit:read',
  MERCHANT_ADMIN: 'merchant:admin',
  CONTENT_MODERATE: 'content:moderate',
  CUSTOMERS_READ: 'customers:read',
} as const;

export type MerchantPermissionValue = (typeof MerchantPermission)[keyof typeof MerchantPermission];

const ROLE_PERMISSIONS: Record<MerchantRoleValue, readonly MerchantPermissionValue[]> = {
  [MerchantRole.PLATFORM_ADMIN]: Object.values(MerchantPermission),
  [MerchantRole.FINANCE_ADMIN]: [
    MerchantPermission.FINANCE_READ,
    MerchantPermission.PAYOUTS_VIEW,
    MerchantPermission.PAYOUTS_APPROVE,
    MerchantPermission.SETTLEMENT_APPROVE,
    MerchantPermission.AUDIT_READ,
  ],
  [MerchantRole.OPERATIONS_ADMIN]: [
    MerchantPermission.FULFILMENT_READ,
    MerchantPermission.FULFILMENT_UPDATE,
    MerchantPermission.CATALOG_READ,
    MerchantPermission.DEAL_CREATE,
    MerchantPermission.MERCHANT_ADMIN,
  ],
  [MerchantRole.MARKETING_ADMIN]: [
    MerchantPermission.MARKETING_OPT_IN,
    MerchantPermission.MARKETING_CREATE,
    MerchantPermission.DEAL_CREATE,
    MerchantPermission.CATALOG_READ,
  ],
  [MerchantRole.SUPPORT]: [
    MerchantPermission.CATALOG_READ,
    MerchantPermission.FULFILMENT_READ,
    MerchantPermission.FINANCE_READ,
    MerchantPermission.CUSTOMERS_READ,
    MerchantPermission.CONTENT_MODERATE,
  ],
  [MerchantRole.MERCHANT_OWNER]: [
    MerchantPermission.CATALOG_READ,
    MerchantPermission.CATALOG_WRITE,
    MerchantPermission.DEAL_CREATE,
    MerchantPermission.FULFILMENT_READ,
    MerchantPermission.FULFILMENT_UPDATE,
    MerchantPermission.MARKETING_OPT_IN,
    MerchantPermission.MARKETING_CREATE,
    MerchantPermission.FINANCE_READ,
    MerchantPermission.PAYOUTS_VIEW,
  ],
  [MerchantRole.MERCHANT_MANAGER]: [
    MerchantPermission.CATALOG_READ,
    MerchantPermission.CATALOG_WRITE,
    MerchantPermission.DEAL_CREATE,
    MerchantPermission.FULFILMENT_READ,
    MerchantPermission.FULFILMENT_UPDATE,
    MerchantPermission.MARKETING_OPT_IN,
    MerchantPermission.FINANCE_READ,
    MerchantPermission.PAYOUTS_VIEW,
  ],
  [MerchantRole.MERCHANT_FULFILMENT]: [
    MerchantPermission.CATALOG_READ,
    MerchantPermission.FULFILMENT_READ,
    MerchantPermission.FULFILMENT_UPDATE,
  ],
  [MerchantRole.CUSTOMER]: [MerchantPermission.CATALOG_READ],
};

export function hasMerchantPermission(role: MerchantRoleValue, permission: MerchantPermissionValue): boolean {
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  return allowed.includes(permission);
}