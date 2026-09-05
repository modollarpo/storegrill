import { prisma } from '../db/prisma.js';
import { startImportJob } from './import-engine.js';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface JobOutcome<T = unknown> {
  status: 'completed' | 'failed';
  result?: T;
  error?: string;
}

export interface JobLifecycle<T> {
  markRunning?: (() => Promise<void>) | undefined;
  markDone?: ((result: T) => Promise<void>) | undefined;
  markFailed?: ((error: unknown) => Promise<void>) | undefined;
}

/**
 * Framing for the async job queue: runs a job body with optional lifecycle
 * hooks. Every failure is caught and reported through `markFailed`, so a
 * queueing caller never drops an unhandled rejection. Pure orchestration —
 * all side effects are injected, so it is unit-testable without a database.
 */
export async function executeJob<T = unknown>(
  runner: () => Promise<T>,
  lifecycle: JobLifecycle<T> = {},
): Promise<JobOutcome<T>> {
  try {
    await lifecycle.markRunning?.();
    const result = await runner();
    await lifecycle.markDone?.(result);
    return { status: 'completed', result };
  } catch (error) {
    try {
      await lifecycle.markFailed?.(error);
    } catch {
      // Failure bookkeeping must never mask the job's own error.
    }
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Queues an import job for background execution. startImportJob manages the
 * RUNNING/COMPLETED/FAILED transitions itself; this wrapper catches any
 * synchronous surprises (e.g. a job that vanished) and marks the job FAILED
 * so the queue never leaks an unhandled rejection.
 */
export async function queueImportJob(jobId: string): Promise<JobOutcome> {
  return executeJob(() => startImportJob(jobId), {
    markFailed: async error => {
      await prisma.importJob
        .update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errors: JSON.stringify([{ message: error instanceof Error ? error.message : String(error) }]),
          },
        })
        .catch(() => undefined);
    },
  });
}