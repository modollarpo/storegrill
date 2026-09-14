import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import type { FeedChannel } from './feed-builder.js';

export interface FeedLogInput {
  regionKey: string;
  channel: FeedChannel;
  status: 'SUCCESS' | 'FAILED';
  itemCount?: number;
  durationMs?: number;
  error?: string;
}

export async function recordFeedGeneration(input: FeedLogInput, prisma: PrismaClient = db) {
  return prisma.feedGenerationLog.create({
    data: {
      regionKey: input.regionKey,
      channel: input.channel,
      status: input.status,
      itemCount: input.itemCount ?? 0,
      durationMs: input.durationMs ?? 0,
      error: input.error ?? null,
    },
  });
}

export async function getLatestFeeds(prisma: PrismaClient = db) {
  const logs = await prisma.feedGenerationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const latest = new Map<string, (typeof logs)[number]>();
  for (const row of logs) {
    const key = `${row.regionKey}:${row.channel}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return Array.from(latest.values()).sort((a, b) =>
    a.regionKey === b.regionKey ? a.channel.localeCompare(b.channel) : a.regionKey.localeCompare(b.regionKey),
  );
}

export async function getFeedHistory(
  regionKey: string,
  channel: FeedChannel,
  limit: number = 20,
  prisma: PrismaClient = db,
) {
  return prisma.feedGenerationLog.findMany({
    where: { regionKey, channel },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}