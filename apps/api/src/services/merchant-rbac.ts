import { NextFunction, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  hasMerchantPermission,
  MerchantRole,
  type MerchantPermissionValue,
  type MerchantRoleValue,
} from '@Storegrill/shared';

export interface MerchantContext {
  vendorId: string;
  role: MerchantRoleValue;
  permissionOverrides?: MerchantPermissionValue[];
}

/**
 * Resolves which merchant (vendor) a user acts on behalf of.
 * 1. An ACTIVE MerchantMember row wins (staff acting for a vendor).
 * 2. Otherwise the vendor's own profile (the owner), once ACTIVE.
 * Returns null when the user belongs to no merchant.
 */
export async function resolveMerchantContext(userId: string): Promise<MerchantContext | null> {
  const member = await prisma.merchantMember.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { vendorId: true, role: true, permissions: true },
  });
  if (member) {
    const overrides = safeParsePermissions(member.permissions);
    return { vendorId: member.vendorId, role: member.role as MerchantRoleValue, permissionOverrides: overrides };
  }
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  if (vendor && vendor.status === 'ACTIVE') {
    return { vendorId: vendor.id, role: MerchantRole.MERCHANT_OWNER };
  }
  return null;
}

function safeParsePermissions(raw: string): MerchantPermissionValue[] | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    const values = parsed.filter((v): v is MerchantPermissionValue => typeof v === 'string');
    return values.length > 0 ? values : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Middleware: requires an authenticated user with at least one of the given
 * merchant permissions on their merchant context. Attaches `req.merchant`.
 */
export function requireMerchantPermission(...permissions: MerchantPermissionValue[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const context = await resolveMerchantContext(req.user.id);
    if (!context) {
      return res.status(403).json({
        error: { code: 'MERCHANT_CONTEXT_REQUIRED', message: 'No active merchant context for this user' },
      });
    }
    const allowed = permissions.some(
      permission =>
        hasMerchantPermission(context.role, permission) ||
        context.permissionOverrides?.includes(permission),
    );
    if (!allowed) {
      return res.status(403).json({
        error: { code: 'MERCHANT_FORBIDDEN', message: `Your merchant role (${context.role}) lacks the required permission` },
      });
    }
    req.merchant = context;
    next();
  };
}