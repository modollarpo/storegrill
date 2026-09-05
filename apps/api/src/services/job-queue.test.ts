import { describe, it, expect, vi } from 'vitest';
import { executeJob } from './job-queue.js';

describe('job-queue framing', () => {
  it('runs the job body and reports completion', async () => {
    const runner = vi.fn().mockResolvedValue(42);
    const markRunning = vi.fn();
    const markDone = vi.fn();

    const outcome = await executeJob(runner, { markRunning, markDone });

    expect(outcome).toEqual({ status: 'completed', result: 42 });
    expect(runner).toHaveBeenCalledTimes(1);
    expect(markRunning).toHaveBeenCalledTimes(1);
    expect(markDone).toHaveBeenCalledWith(42);
  });

  it('flags the job as failed on a runner error and never rethrows', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('boom'));
    const markFailed = vi.fn();

    const outcome = await executeJob(runner, { markFailed });

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toBe('boom');
    expect(markFailed).toHaveBeenCalledWith(expect.any(Error));
  });

  it('still returns a failed outcome when markFailed itself throws', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('boom'));
    const markFailed = vi.fn().mockRejectedValue(new Error('persist failed'));

    const outcome = await executeJob(runner, { markFailed });

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toBe('boom');
  });
});