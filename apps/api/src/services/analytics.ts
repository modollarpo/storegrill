import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';

export interface TrackEventInput {
  eventType: string;
  userId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  region?: string;
}

export interface AnalyticsSummary {
  eventType: string;
  count: number;
  totalValue: number;
  avgValue: number;
}

export async function trackEvent(input: TrackEventInput, prisma: PrismaClient = db) {
  return prisma.analyticsEvent.create({
    data: {
      eventType: input.eventType,
      userId: input.userId,
      sessionId: input.sessionId,
      entityType: input.entityType,
      entityId: input.entityId,
      value: input.value ?? 0,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      region: input.region,
    },
  });
}

export async function trackBatch(events: TrackEventInput[], prisma: PrismaClient = db) {
  return prisma.analyticsEvent.createMany({
    data: events.map(e => ({
      eventType: e.eventType,
      userId: e.userId,
      sessionId: e.sessionId,
      entityType: e.entityType,
      entityId: e.entityId,
      value: e.value ?? 0,
      metadata: e.metadata ? JSON.stringify(e.metadata) : null,
      region: e.region,
    })),
  });
}

export async function getSummary(
  eventType: string,
  startDate: Date,
  endDate: Date,
  groupBy?: 'day' | 'hour',
  prisma: PrismaClient = db,
): Promise<AnalyticsSummary> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventType,
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  return {
    eventType,
    count: events.length,
    totalValue: events.reduce((sum, e) => sum + e.value, 0),
    avgValue: events.length > 0 ? events.reduce((sum, e) => sum + e.value, 0) / events.length : 0,
  };
}

export async function getTopEntities(
  eventType: string,
  entityType: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10,
  prisma: PrismaClient = db,
) {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventType,
      entityType,
      entityId: { not: null },
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  const counts = new Map<string, { count: number; value: number }>();
  for (const event of events) {
    if (!event.entityId) continue;
    const existing = counts.get(event.entityId) ?? { count: 0, value: 0 };
    existing.count++;
    existing.value += event.value;
    counts.set(event.entityId, existing);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([entityId, stats]) => ({ entityId, ...stats }));
}

export async function getUserEvents(
  userId: string,
  limit: number = 50,
  prisma: PrismaClient = db,
) {
  return prisma.analyticsEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
