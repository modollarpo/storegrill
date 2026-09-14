import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { recordFeedGeneration, getLatestFeeds, getFeedHistory } from './feed-log.js';

function nowIso(offsetMinutes: number): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString();
}

function stubPrisma(logs: Array<Record<string, unknown>> = []) {
  return {
    feedGenerationLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `log-${logs.length + 1}`, createdAt: nowIso(0), ...data };
        logs.push(row);
        return row;
      }),
      findMany: vi.fn(async ({ where, take }: { where?: Record<string, unknown>; take?: number }) => {
        let rows = [...logs];
        if (where?.regionKey) rows = rows.filter(r => r.regionKey === where.regionKey);
        if (where?.channel) rows = rows.filter(r => r.channel === where.channel);
        rows.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
        return take ? rows.slice(0, take) : rows;
      }),
    },
  } as unknown as PrismaClient;
}

describe('recordFeedGeneration', () => {
  it('persists a successful build with item count and duration', async () => {
    const prisma = stubPrisma();
    const row = await recordFeedGeneration(
      { regionKey: 'UK', channel: 'google-merchant', status: 'SUCCESS', itemCount: 420, durationMs: 1300 },
      prisma,
    );

    expect(row.regionKey).toBe('UK');
    expect(row.channel).toBe('google-merchant');
    expect(row.status).toBe('SUCCESS');
    expect(row.itemCount).toBe(420);
    expect(row.durationMs).toBe(1300);
  });

  it('defaults itemCount and duration to zero when omitted', async () => {
    const prisma = stubPrisma();
    const row = await recordFeedGeneration(
      { regionKey: 'NG', channel: 'pinterest', status: 'FAILED', error: 'DB timeout' },
      prisma,
    );

    expect(row.itemCount).toBe(0);
    expect(row.durationMs).toBe(0);
    expect(row.error).toBe('DB timeout');
  });
});

describe('getLatestFeeds', () => {
  it('returns exactly one row per region-channel pair, preferring the newest', async () => {
    const prisma = stubPrisma([
      { id: '1', regionKey: 'UK', channel: 'facebook', status: 'SUCCESS', itemCount: 100, createdAt: nowIso(60) },
      { id: '2', regionKey: 'UK', channel: 'facebook', status: 'SUCCESS', itemCount: 150, createdAt: nowIso(30) },
      { id: '3', regionKey: 'UK', channel: 'tiktok', status: 'FAILED', error: 'boom', createdAt: nowIso(20) },
      { id: '4', regionKey: 'AE', channel: 'google-merchant', status: 'SUCCESS', itemCount: 0, createdAt: nowIso(10) },
    ]);

    const latest = await getLatestFeeds(prisma);

    expect(latest).toHaveLength(3);
    const ukFb = latest.find(f => f.regionKey === 'UK' && f.channel === 'facebook');
    expect(ukFb?.itemCount).toBe(150);
    expect(latest.map(f => `${f.regionKey}:${f.channel}`).sort()).toEqual(['AE:google-merchant', 'UK:facebook', 'UK:tiktok']);
  });
});

describe('getFeedHistory', () => {
  it('filters by region and channel and caps the result at the limit', async () => {
    const prisma = stubPrisma(
      Array.from({ length: 25 }, (_, i) => ({
        id: String(i),
        regionKey: 'US',
        channel: 'google-merchant',
        status: 'SUCCESS',
        itemCount: i,
        createdAt: nowIso(i),
      })),
    );

    const history = await getFeedHistory('US', 'google-merchant', 20, prisma);

    expect(history).toHaveLength(20);
    expect(history[0].itemCount).toBe(0);
  });
});