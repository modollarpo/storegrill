import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPct?: number;
  metadata?: Record<string, unknown>;
}

export async function createFlag(input: FeatureFlagConfig, prisma: PrismaClient = db) {
  return prisma.featureFlag.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      enabled: input.enabled ?? false,
      rolloutPct: input.rolloutPct ?? 0,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function updateFlag(key: string, input: Partial<FeatureFlagConfig>, prisma: PrismaClient = db) {
  return prisma.featureFlag.update({
    where: { key },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.rolloutPct !== undefined && { rolloutPct: input.rolloutPct }),
      ...(input.metadata !== undefined && { metadata: JSON.stringify(input.metadata) }),
    },
  });
}

export async function getFlag(key: string, prisma: PrismaClient = db) {
  return prisma.featureFlag.findUnique({ where: { key } });
}

export async function isFlagEnabled(key: string, userId?: string, prisma: PrismaClient = db): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag || !flag.enabled) return false;
  if (flag.rolloutPct >= 100) return true;
  if (flag.rolloutPct <= 0) return false;
  const hash = userId
    ? Array.from(userId).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    : Math.floor(Math.random() * 100);
  return Math.abs(hash) % 100 < flag.rolloutPct;
}

export async function deleteFlag(key: string, prisma: PrismaClient = db) {
  return prisma.featureFlag.delete({ where: { key } });
}

export async function listFlags(prisma: PrismaClient = db) {
  return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
}

const flagCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function isFlagEnabledCached(key: string, userId?: string, prisma: PrismaClient = db): Promise<boolean> {
  const cacheKey = `${key}:${userId ?? 'anon'}`;
  const cached = flagCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await isFlagEnabled(key, userId, prisma);
  flagCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
