import { describe, it, expect } from 'vitest';
import {
  assertMerchantApproval,
  assertMerchantKycDecision,
  assertMerchantTransition,
  merchantStatusToApplication,
} from './merchant-lifecycle.js';

describe('merchant-lifecycle adapter', () => {
  it('maps legacy statuses to canonical merchant states', () => {
    expect(merchantStatusToApplication('PENDING')).toBe('APPLICATION');
    expect(merchantStatusToApplication('UNDER_REVIEW')).toBe('UNDER_REVIEW');
    expect(merchantStatusToApplication('BANNED')).toBe('TERMINATED');
    expect(merchantStatusToApplication('BOGUS')).toBeNull();
  });

  it('allows the legal submission path', () => {
    expect(assertMerchantTransition({ from: 'PENDING', to: 'UNDER_REVIEW', kycVerified: false }).ok).toBe(true);
    expect(assertMerchantTransition({ from: 'PENDING', to: 'REJECTED', kycVerified: false }).ok).toBe(true);
    expect(assertMerchantTransition({ from: 'UNDER_REVIEW', to: 'REJECTED', kycVerified: false }).ok).toBe(true);
  });

  it('rejects illegal skips through the canonical engine', () => {
    const jump = assertMerchantTransition({ from: 'PENDING', to: 'ACTIVE', kycVerified: true });
    expect(jump.ok).toBe(false);
    expect(jump.reason).toContain('Cannot move merchant');
  });

  it('rejects progress toward ACTIVE without KYC', () => {
    const toVerified = assertMerchantTransition({ from: 'UNDER_REVIEW', to: 'VERIFIED', kycVerified: false });
    expect(toVerified.ok).toBe(false);
    expect(toVerified.reason).toContain('KYC');
  });

  it('approval passes PENDING through VERIFIED when KYC is approved', () => {
    const decision = assertMerchantApproval('UNDER_REVIEW', true);
    expect(decision.ok).toBe(true);
  });

  it('approval is refused when KYC has not been approved', () => {
    const decision = assertMerchantApproval('UNDER_REVIEW', false);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain('KYC');
  });

  it('approval refuses unknown or terminal states', () => {
    expect(assertMerchantApproval('REJECTED', true).ok).toBe(false);
    expect(assertMerchantApproval('BANNED', true).ok).toBe(false);
    expect(assertMerchantApproval('ACTIVE', true).ok).toBe(true);
  });

  it('KYC decision gates on an application being in review', () => {
    expect(assertMerchantKycDecision('UNDER_REVIEW', 'APPROVED').ok).toBe(true);
    expect(assertMerchantKycDecision('ACTIVE', 'APPROVED').ok).toBe(false);
  });

  it('treats repeated status writes as idempotent no-ops', () => {
    expect(assertMerchantTransition({ from: 'ACTIVE', to: 'ACTIVE' }).ok).toBe(true);
  });
});