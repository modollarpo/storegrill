import { isCronDue, DEFAULT_REGIONS } from '@Storegrill/shared';
import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { startImportJob } from './import-engine.js';
import { pollTrackedShipments } from './carriers.js';
import { executeJob } from './job-queue.js';
import { checkAndSendAbandonedCarts, checkAndSendReviewRequests } from './customer-journey.js';
import { buildFeed, FeedChannel } from './feed-builder.js';

const TICK_MS = 60_000;
const FEED_WARM_INTERVAL_MS = 3_600_000;
const FEED_WARM_ENABLED = process.env.FEED_WARMER_ENABLED !== 'false';

export function startScheduler(prisma: PrismaClient = db): NodeJS.Timeout {
  const timer = setInterval(() => {
    void tick(prisma).catch(error => {
      console.error('[scheduler] tick failed:', error instanceof Error ? error.message : error);
    });
  }, TICK_MS);
  timer.unref();
  console.log(`[scheduler] started, checking schedules every ${TICK_MS / 1000}s`);
  if (FEED_WARM_ENABLED) {
    const warmer = setInterval(() => {
      void tickFeedWarmer(prisma).catch(error => {
        console.error('[feed-warmer] tick failed:', error instanceof Error ? error.message : error);
      });
    }, FEED_WARM_INTERVAL_MS);
    warmer.unref();
    console.log(`[feed-warmer] started, warming feeds every ${FEED_WARM_INTERVAL_MS / 1000}s`);
  } else {
    console.log('[feed-warmer] disabled (FEED_WARMER_ENABLED=false)');
  }
  return timer;
}

export async function tickFeedWarmer(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.productRegionPrice.findMany({
    distinct: ['regionKey'],
    select: { regionKey: true },
  });
  const regionKeys = rows.map(r => r.regionKey).filter(k => DEFAULT_REGIONS.some(r => r.key === k));
  if (regionKeys.length === 0) {
    console.log('[feed-warmer] no regions with priced products; skipping warm');
    return;
  }

  const channels: FeedChannel[] = ['google-merchant', 'facebook', 'tiktok', 'pinterest'];
  for (const regionKey of regionKeys) {
    for (const channel of channels) {
      try {
        await buildFeed(regionKey, channel);
      } catch (error) {
        console.error(`[feed-warmer] ${regionKey}/${channel} failed:`, error instanceof Error ? error.message : error);
      }
    }
  }
  console.log('[feed-warmer] warmed', channels.length, 'channels for', regionKeys.join(', '));
}

async function tick(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const currentMinuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

  await tickImportSchedules(prisma, now, currentMinuteStart);
  await tickTrackingPoll(prisma);
  await tickVoucherExpiry(prisma);
  await tickAIUsageAggregation(prisma);
  await tickCustomerJourneys(prisma);
}

async function tickCustomerJourneys(_prisma: PrismaClient): Promise<void> {
  try {
    const cartsSent = await checkAndSendAbandonedCarts();
    const reviewsSent = await checkAndSendReviewRequests();
    if (cartsSent > 0 || reviewsSent > 0) {
      console.log(`[customer-journey] sent ${cartsSent} abandoned cart reminders and ${reviewsSent} review requests`);
    }
  } catch (error) {
    console.error('[customer-journey] tick failed:', error instanceof Error ? error.message : error);
  }
}

async function tickImportSchedules(prisma: PrismaClient, now: Date, currentMinuteStart: Date): Promise<void> {
  const schedules = await prisma.importSchedule.findMany({ where: { enabled: true } });

  for (const schedule of schedules) {
    if (!isCronDue(schedule.cadenceCron, now)) continue;
    if (schedule.lastRunAt && schedule.lastRunAt >= currentMinuteStart) continue;

    const activeJob = await prisma.importJob.findFirst({
      where: { vendorId: schedule.vendorId, status: { in: ['PENDING', 'RUNNING'] } },
    });
    if (activeJob) continue;

    const job = await prisma.importJob.create({
      data: {
        vendorId: schedule.vendorId,
        type: 'URL_FEED',
        source: schedule.url,
        mode: 'APPLY',
        phase: 'FETCHING',
        scheduleId: schedule.id,
      },
    });
    await prisma.importSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: now },
    });
    console.log(`[import-scheduler] triggered job ${job.id} for schedule "${schedule.name}"`);
    await startImportJob(job.id);
  }
}

async function tickTrackingPoll(_prisma: PrismaClient): Promise<void> {
  try {
    const result = await pollTrackedShipments();
    if (result.updated > 0) {
      console.log(`[tracking-scheduler] polled ${result.polled} shipments, updated ${result.updated}`);
    }
  } catch (error) {
    console.error('[tracking-scheduler] poll failed:', error instanceof Error ? error.message : error);
  }
}

async function tickVoucherExpiry(prisma: PrismaClient): Promise<void> {
  try {
    const expired = await prisma.voucher.updateMany({
      where: { status: 'ACTIVE', endsAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (expired.count > 0) {
      console.log(`[voucher-scheduler] expired ${expired.count} vouchers`);
    }
  } catch (error) {
    console.error('[voucher-scheduler] failed:', error instanceof Error ? error.message : error);
  }
}

async function tickAIUsageAggregation(prisma: PrismaClient): Promise<void> {
  try {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const requests = await prisma.aIRequest.findMany({
      where: { createdAt: { gte: monthStart } },
      select: {
        inputTokens: true,
        outputTokens: true,
        costMinorUnits: true,
        purpose: true,
        modelConfig: { select: { modelId: true } },
      },
    });

    if (requests.length === 0) return;

    const byPurpose: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostMinorUnits = 0;

    for (const request of requests) {
      totalInputTokens += request.inputTokens;
      totalOutputTokens += request.outputTokens;
      totalCostMinorUnits += request.costMinorUnits;
      byPurpose[request.purpose] = (byPurpose[request.purpose] ?? 0) + 1;
      byModel[request.modelConfig.modelId] = (byModel[request.modelConfig.modelId] ?? 0) + 1;
    }

    await prisma.aIUsageRecord.upsert({
      where: { period },
      update: {
        totalRequests: requests.length,
        totalInputTokens,
        totalOutputTokens,
        totalCostMinorUnits,
        byPurpose: JSON.stringify(byPurpose),
        byModel: JSON.stringify(byModel),
      },
      create: {
        period,
        totalRequests: requests.length,
        totalInputTokens,
        totalOutputTokens,
        totalCostMinorUnits,
        byPurpose: JSON.stringify(byPurpose),
        byModel: JSON.stringify(byModel),
      },
    });
  } catch (error) {
    console.error('[ai-usage-scheduler] failed:', error instanceof Error ? error.message : error);
  }
}
