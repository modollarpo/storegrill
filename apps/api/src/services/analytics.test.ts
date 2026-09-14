import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { trackEvent, trackBatch, getSummary, getEventVolumes, TrackEventInput } from './analytics.js';

function iso(offsetDays: number): Date {
  return new Date(Date.now() - offsetDays * 86400000);
}

interface StoredEvent {
  eventType: string;
  userId?: string | null;
  sessionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  value: number;
  metadata?: string | null;
  region?: string | null;
  createdAt: Date;
}

function stubPrisma(events: StoredEvent[] = []) {
  return {
    analyticsEvent: {
      create: vi.fn(async ({ data }: { data: Omit<StoredEvent, 'createdAt'> & { createdAt?: Date } }) => {
        const row: StoredEvent = { createdAt: new Date(), ...data };
        events.push(row);
        return row;
      }),
      createMany: vi.fn(async ({ data }: { data: Array<Omit<StoredEvent, 'createdAt'> & { createdAt?: Date }> }) => {
        for (const entry of data) {
          events.push({ createdAt: new Date(), ...entry });
        }
        return { count: data.length };
      }),
      findMany: vi.fn(async ({ where, orderBy, take }: { where?: { eventType?: string; userId?: string; entityType?: string; entityId?: string; createdAt?: { gte?: Date; lte?: Date } }; orderBy?: unknown; take?: number }) => {
        let rows = [...events];
        if (where?.eventType) rows = rows.filter(r => r.eventType === where.eventType);
        if (where?.userId) rows = rows.filter(r => r.userId === where.userId);
        if (where?.entityType) rows = rows.filter(r => r.entityType === where.entityType);
        if (where?.createdAt?.gte) rows = rows.filter(r => r.createdAt >= where.createdAt!.gte!);
        if (where?.createdAt?.lte) rows = rows.filter(r => r.createdAt <= where.createdAt!.lte!);
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return take ? rows.slice(0, take) : rows;
      }),
    },
  } as unknown as PrismaClient;
}

function input(overrides: Partial<TrackEventInput> = {}): TrackEventInput {
  return { eventType: 'PAGE_VIEW', ...overrides };
}

describe('trackEvent', () => {
  it('persists a single event with JSON metadata', async () => {
    const prisma = stubPrisma();
    const row = await trackEvent(input({ eventType: 'ADD_TO_CART', userId: 'u1', region: 'UK', value: 2500, metadata: { items: [{ id: 'p1' }] } }), prisma);

    expect(row.eventType).toBe('ADD_TO_CART');
    expect(row.userId).toBe('u1');
    expect(row.region).toBe('UK');
    expect(row.value).toBe(2500);
    expect(JSON.parse(row.metadata!)).toEqual({ items: [{ id: 'p1' }] });
  });
});

describe('trackBatch', () => {
  it('bulk-inserts multiple events', async () => {
    const prisma = stubPrisma();
    const result = await trackBatch([input({ eventType: 'VIEW_ITEM' }), input({ eventType: 'ADD_TO_CART' })], prisma);

    expect(result.count).toBe(2);
    expect(prisma.analyticsEvent.createMany).toHaveBeenCalledTimes(1);
  });
});

describe('getSummary', () => {
  it('counts events in range and aggregates value', async () => {
    const prisma = stubPrisma([
      { eventType: 'PURCHASE', value: 1000, createdAt: iso(1) },
      { eventType: 'PURCHASE', value: 2500, createdAt: iso(2) },
      { eventType: 'PURCHASE', value: 999, createdAt: iso(30) },
    ]);

    const summary = await getSummary('PURCHASE', iso(7), iso(0), undefined, prisma);

    expect(summary.count).toBe(2);
    expect(summary.totalValue).toBe(3500);
    expect(summary.avgValue).toBe(1750);
  });
});

describe('getEventVolumes', () => {
  it('groups by event type, day and region within the window', async () => {
    const prisma = stubPrisma([
      { eventType: 'PAGE_VIEW', value: 0, region: 'UK', createdAt: iso(1) },
      { eventType: 'PAGE_VIEW', value: 0, region: 'UK', createdAt: iso(1) },
      { eventType: 'ADD_TO_CART', value: 1000, region: 'US', createdAt: iso(2) },
      { eventType: 'PURCHASE', value: 5000, region: null, createdAt: iso(30) },
    ]);

    const volumes = await getEventVolumes({ startDate: iso(7), endDate: iso(0) }, prisma);

    expect(volumes.totals.count).toBe(3);
    expect(volumes.totals.totalValue).toBe(1000);
    expect(volumes.byEventType).toEqual([
      { eventType: 'PAGE_VIEW', count: 2 },
      { eventType: 'ADD_TO_CART', count: 1 },
    ]);
    expect(volumes.byDay.reduce((sum, d) => sum + d.count, 0)).toBe(3);
    expect(volumes.byRegion).toEqual([
      { region: 'UK', count: 2 },
      { region: 'US', count: 1 },
    ]);
  });

  it('filters by eventType and region', async () => {
    const prisma = stubPrisma([
      { eventType: 'PAGE_VIEW', value: 0, region: 'UK', createdAt: iso(1) },
      { eventType: 'SEARCH', value: 0, region: 'UK', createdAt: iso(1) },
    ]);

    const volumes = await getEventVolumes({ startDate: iso(7), endDate: iso(0), eventType: 'PAGE_VIEW', region: 'UK' }, prisma);

    expect(volumes.totals.count).toBe(1);
    expect(volumes.byEventType).toEqual([{ eventType: 'PAGE_VIEW', count: 1 }]);
  });
});