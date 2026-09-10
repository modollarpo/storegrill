import { describe, it, expect, vi } from 'vitest';
import { executeJob, runJob, registerJobHandler } from './job-queue.js';

describe('job-queue framing', () => {
  it('runs the job body and reports completion', async () => {
    const runner = vi.fn().mockResolvedValue(42);
    const markRunning = vi.fn();
    const markDone = vi.fn();

    const outcome = await executeJob(runner, { markRunning, markDone });

    expect(outcome).toEqual({ status: 'completed', result: 42, attempts: 1 });
    expect(runner).toHaveBeenCalledTimes(1);
    expect(markRunning).toHaveBeenCalledTimes(1);
    expect(markDone).toHaveBeenCalledWith(42);
  });

  it('flags the job as failed on a runner error and never rethrows', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('boom'));
    const markFailed = vi.fn();

    const outcome = await executeJob(runner, { markFailed }, { maxAttempts: 1 });

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toBe('boom');
    expect(outcome.attempts).toBe(1);
    expect(markFailed).toHaveBeenCalledWith(expect.any(Error));
  });

  it('still returns a failed outcome when markFailed itself throws', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('boom'));
    const markFailed = vi.fn().mockRejectedValue(new Error('persist failed'));

    const outcome = await executeJob(runner, { markFailed }, { maxAttempts: 1 });

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toBe('boom');
  });

  it('retries on failure and succeeds on attempt 2', async () => {
    const runner = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok');

    const outcome = await executeJob(runner, {}, { maxAttempts: 2, baseDelayMs: 1 });

    expect(outcome).toEqual({ status: 'completed', result: 'ok', attempts: 2 });
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxAttempts then fails', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('persistent'));

    const outcome = await executeJob(runner, {}, { maxAttempts: 3, baseDelayMs: 1 });

    expect(outcome.status).toBe('failed');
    expect(outcome.attempts).toBe(3);
    expect(runner).toHaveBeenCalledTimes(3);
  });
});

describe('job registry', () => {
  it('runs a registered handler', async () => {
    registerJobHandler('AI_CONTENT', async (payload) => ({ generated: true, payload }));
    const outcome = await runJob('AI_CONTENT', { productId: '123' });
    expect(outcome.status).toBe('completed');
    expect(outcome.result).toEqual({ generated: true, payload: { productId: '123' } });
  });

  it('fails for unregistered job type', async () => {
    const outcome = await runJob('NONEXISTENT' as any, {});
    expect(outcome.status).toBe('failed');
    expect(outcome.error).toContain('No handler');
  });
});
