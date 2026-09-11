import { prisma } from '../db/prisma.js';
import { startImportJob } from './import-engine.js';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type JobType = 'IMPORT' | 'VOUCHER_REDEMPTION' | 'PAYOUT_BATCH' | 'AI_CONTENT' | 'ANALYTICS_AGGREGATE' | 'EXPERIMENT_AGGREGATE';

export interface JobOutcome<T = unknown> {
  status: 'completed' | 'failed';
  result?: T;
  error?: string;
  attempts: number;
}

export interface JobLifecycle<T> {
  markRunning?: (() => Promise<void>) | undefined;
  markDone?: ((result: T) => Promise<void>) | undefined;
  markFailed?: ((error: unknown) => Promise<void>) | undefined;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, config: RetryConfig): number {
  const exp = Math.pow(config.backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 + 0.85;
  return Math.min(config.baseDelayMs * exp * jitter, config.maxDelayMs);
}

export async function executeJob<T = unknown>(
  runner: () => Promise<T>,
  lifecycle: JobLifecycle<T> = {},
  retryConfig: Partial<RetryConfig> = {},
): Promise<JobOutcome<T>> {
  const config = { ...DEFAULT_RETRY, ...retryConfig };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      if (attempt === 1) await lifecycle.markRunning?.();
      const result = await runner();
      await lifecycle.markDone?.(result);
      return { status: 'completed', result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < config.maxAttempts) {
        await delay(backoffDelay(attempt, config));
        continue;
      }
    }
  }

  try {
    await lifecycle.markFailed?.(lastError);
  } catch {
    // Failure bookkeeping must never mask the job's own error.
  }
  return {
    status: 'failed',
    error: lastError instanceof Error ? lastError.message : String(lastError),
    attempts: config.maxAttempts,
  };
}

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

const jobHandlers = new Map<JobType, (payload: Record<string, unknown>) => Promise<unknown>>();

export function registerJobHandler(type: JobType, handler: (payload: Record<string, unknown>) => Promise<unknown>): void {
  jobHandlers.set(type, handler);
}

export async function runJob(type: JobType, payload: Record<string, unknown>): Promise<JobOutcome> {
  const handler = jobHandlers.get(type);
  if (!handler) return { status: 'failed', error: `No handler registered for job type: ${type}`, attempts: 0 };
  return executeJob(() => handler(payload));
}
