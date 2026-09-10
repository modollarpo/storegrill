import { isCronDue } from '@Storegrill/shared';
import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { startImportJob } from './import-engine.js';
import { pollTrackedShipments } from './carriers.js';
import { executeJob } from './job-queue.js';

const TICK_MS = 60_000;

export function startScheduler(prisma: PrismaClient = db): NodeJS.Timeout {
  const timer = setInterval(() => {
    void tick(prisma).catch(error => {
      console.error('[scheduler] tick failed:', error instanceof Error ? error.message : error);
    });
  }, TICK_MS);
  timer.unref();
  console.log(`[scheduler] started, checking schedules every ${TICK_MS / 1000}s`);
  return timer;
}

async function tick(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const currentMinuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

  await tickImportSchedules(prisma, now, currentMinuteStart);
  await tickTrackingPoll(prisma);
  await tickVoucherExpiry(prisma);
  await tickAnalyticsAggregation(prisma);
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

async function tickAnalyticsAggregation(prisma: PrismaClient): Promise<void> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: oneHourAgo, lt: now } },
    });

    if (events.length === 0) return;

    const byPurpose: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalTokens = 0;
    let totalCost = 0;

    for (const event of events) {
      byPurpose[event.eventType] = (byPurpose[event.eventType] ?? 0) + 1;
    }

    await prisma.aIUsageRecord.upsert({
      where: { period },
      update: {
        totalRequests: { increment: events.length },
        totalInputTokens: { increment: totalTokens },
        totalOutputTokens: { increment: 0 },
        totalCostMinorUnits: { increment: totalCost },
      },
      create: {
        period,
        totalRequests: events.length,
        totalInputTokens: totalTokens,
        totalOutputTokens: 0,
        totalCostMinorUnits: totalCost,
        byPurpose: JSON.stringify(byPurpose),
        byModel: JSON.stringify(byModel),
      },
    });
  } catch (error) {
    console.error('[analytics-scheduler] failed:', error instanceof Error ? error.message : error);
  }
}
