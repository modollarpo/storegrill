import {
  MerchantStatus,
  validateMerchantTransition,
  type MerchantStatusValue,
} from '@Storegrill/shared';

/**
 * Adapter between the application's legacy status strings (PENDING /
 * UNDER_REVIEW / ACTIVE / REJECTED / SUSPENDED / BANNED) and the canonical
 * merchant lifecycle states in packages/shared/domain/merchant.ts. All
 * transition decisions delegate to the shared pure engine.
 */

const LEGACY_TO_CANONICAL: Record<string, MerchantStatusValue> = {
  PENDING: MerchantStatus.APPLICATION,
  UNDER_REVIEW: MerchantStatus.UNDER_REVIEW,
  APPROVED: MerchantStatus.VERIFIED,
  VERIFIED: MerchantStatus.VERIFIED,
  ACTIVE: MerchantStatus.ACTIVE,
  SUSPENDED: MerchantStatus.SUSPENDED,
  RESTRICTED: MerchantStatus.RESTRICTED,
  BANNED: MerchantStatus.TERMINATED,
  TERMINATED: MerchantStatus.TERMINATED,
  REJECTED: MerchantStatus.REJECTED,
  DRAFT: MerchantStatus.DRAFT,
  APPLICATION: MerchantStatus.APPLICATION,
};

export interface TransitionDecision {
  ok: boolean;
  from: string | null;
  to: string | null;
  reason: string | null;
}

function canonical(status: string | null | undefined): MerchantStatusValue | null {
  if (!status) return null;
  return LEGACY_TO_CANONICAL[status] ?? null;
}

function ok(from: string | null, to: string | null): TransitionDecision {
  return { ok: true, from, to, reason: null };
}

function fail(reason: string, from: string | null, to: string | null): TransitionDecision {
  return { ok: false, from, to, reason };
}

export function assertMerchantTransition(opts: {
  from: string | null | undefined;
  to: string;
  kycVerified?: boolean;
}): TransitionDecision {
  const canonicalFrom = canonical(opts.from);
  const canonicalTo = canonical(opts.to);

  if (!canonicalFrom) {
    return fail(`Unknown merchant status "${opts.from ?? '(none)'}"`, null, canonicalTo);
  }
  if (!canonicalTo) {
    return fail(`Unknown merchant status "${opts.to}"`, canonicalFrom, null);
  }
  if (canonicalFrom === canonicalTo) {
    return ok(canonicalFrom, canonicalTo);
  }
  const reason = validateMerchantTransition(canonicalFrom, canonicalTo, opts.kycVerified ?? false);
  return reason == null ? ok(canonicalFrom, canonicalTo) : fail(reason, canonicalFrom, canonicalTo);
}

/**
 * Approval is the one composite action: an application must pass through the
 * VERIFIED gate (set by the admin KYC decision) before becoming ACTIVE. Both
 * edges are validated so a skipped step is impossible.
 */
export function assertMerchantApproval(status: string | null | undefined, kycVerified: boolean): TransitionDecision {
  if (status === 'ACTIVE') {
    return ok(MerchantStatus.ACTIVE, MerchantStatus.ACTIVE);
  }
  const canonicalStatus = canonical(status);
  if (canonicalStatus !== MerchantStatus.APPLICATION && canonicalStatus !== MerchantStatus.UNDER_REVIEW) {
    return fail(`Cannot approve a ${status ?? '(none)'} application`, canonicalStatus, MerchantStatus.ACTIVE);
  }
  if (!kycVerified) {
    return fail(
      'KYC verification must be complete before the merchant can become active',
      canonicalStatus,
      MerchantStatus.ACTIVE,
    );
  }
  const toVerified = validateMerchantTransition(canonicalStatus, MerchantStatus.VERIFIED, true);
  if (toVerified != null) {
    return fail(toVerified, canonicalStatus, MerchantStatus.ACTIVE);
  }
  const toActive = validateMerchantTransition(MerchantStatus.VERIFIED, MerchantStatus.ACTIVE, true);
  if (toActive != null) {
    return fail(toActive, MerchantStatus.VERIFIED, MerchantStatus.ACTIVE);
  }
  return ok(canonicalStatus, MerchantStatus.ACTIVE);
}

export function assertMerchantKycDecision(status: string | null | undefined, decision: 'APPROVED' | 'REJECTED'): TransitionDecision {
  const canonicalStatus = canonical(status);
  if (canonicalStatus !== MerchantStatus.APPLICATION && canonicalStatus !== MerchantStatus.UNDER_REVIEW) {
    return fail(
      `KYC can only be decided for an application in review, not ${status ?? '(none)'}`,
      canonicalStatus,
      null,
    );
  }
  return ok(canonicalStatus, decision === 'APPROVED' ? MerchantStatus.VERIFIED : MerchantStatus.REJECTED);
}

export function merchantStatusToApplication(status: string | null | undefined): string | null {
  return canonical(status);
}