import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export interface AnomalyConfig {
  metric: string;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function detectAnomaly(
  config: AnomalyConfig,
  value: number,
  metadata?: Record<string, unknown>,
  prisma: PrismaClient = db,
) {
  const severity = config.severity;
  const isAnomaly = value > config.threshold;

  if (!isAnomaly) return null;

  return prisma.aIAnomaly.create({
    data: {
      metric: config.metric,
      value,
      threshold: config.threshold,
      severity,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function getOpenAnomalies(prisma: PrismaClient = db) {
  return prisma.aIAnomaly.findMany({
    where: { status: 'OPEN' },
    orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
  });
}

export async function resolveAnomaly(id: string, resolvedBy: string, prisma: PrismaClient = db) {
  return prisma.aIAnomaly.update({
    where: { id },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy },
  });
}

export async function getAnomalyStats(prisma: PrismaClient = db) {
  return prisma.aIAnomaly.groupBy({
    by: ['metric', 'severity'],
    _count: { id: true },
  });
}
