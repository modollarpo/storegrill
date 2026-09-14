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

export interface EventVolumeOptions {
  startDate: Date;
  endDate: Date;
  eventType?: string;
  region?: string;
}

export interface EventVolumes {
  totals: { count: number; totalValue: number };
  byEventType: Array<{ eventType: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
}

export async function getEventVolumes(
  options: EventVolumeOptions,
  prisma: PrismaClient = db,
): Promise<EventVolumes> {
  const where = {
    ...(options.eventType ? { eventType: options.eventType } : {}),
    ...(options.region ? { region: options.region } : {}),
    createdAt: { gte: options.startDate, lte: options.endDate },
  };
  const events = await prisma.analyticsEvent.findMany({ where });

  const byEventType = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byRegion = new Map<string, number>();
  let totalValue = 0;

  for (const event of events) {
    byEventType.set(event.eventType, (byEventType.get(event.eventType) ?? 0) + 1);
    byDay.set(event.createdAt.toISOString().slice(0, 10), (byDay.get(event.createdAt.toISOString().slice(0, 10)) ?? 0) + 1);
    byRegion.set(event.region ?? 'UNKNOWN', (byRegion.get(event.region ?? 'UNKNOWN') ?? 0) + 1);
    totalValue += event.value;
  }

  const sortByCount = (a: { count: number }, b: { count: number }) => b.count - a.count;
  return {
    totals: { count: events.length, totalValue },
    byEventType: Array.from(byEventType.entries()).map(([eventType, count]) => ({ eventType, count })).sort(sortByCount),
    byDay: Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byRegion: Array.from(byRegion.entries()).map(([region, count]) => ({ region, count })).sort(sortByCount),
  };
}
