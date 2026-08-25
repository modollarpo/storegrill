import { isCronDue } from '@storegrill/shared';
import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { startImportJob } from './import-engine.js';

const TICK_MS = 60_000;

export function startScheduler(prisma: PrismaClient = db): NodeJS.Timeout {
  const timer = setInterval(() => {
    void tick(prisma).catch(error => {
      console.error('[import-scheduler] tick failed:', error instanceof Error ? error.message : error);
    });
  }, TICK_MS);
  timer.unref();
  console.log(`[import-scheduler] started, checking schedules every ${TICK_MS / 1000}s`);
  return timer;
}

async function tick(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const currentMinuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

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
