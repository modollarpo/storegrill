import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockCreate, mockSend, mockReceive, mockDelete } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSend: vi.fn(),
  mockReceive: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@azure/storage-queue', () => ({
  QueueServiceClient: {
    fromConnectionString: () => ({
      getQueueClient: () => ({
        createIfNotExists: mockCreate,
        sendMessage: mockSend,
        receiveMessages: mockReceive,
        deleteMessage: mockDelete,
      }),
    }),
  },
}));

vi.mock('./ai-search.js', () => ({
  reindexProducts: vi.fn(),
}));

import { isReindexQueueConfigured, ensureQueue, enqueueReindexTask, drainReindexQueue } from './reindex-queue.js';
import { reindexProducts } from './ai-search.js';

describe('reindex-queue service', () => {
  beforeEach(() => {
    delete process.env.AZURE_QUEUE_CONNECTION_STRING;
    mockCreate.mockReset();
    mockSend.mockReset();
    mockReceive.mockReset();
    mockDelete.mockReset();
    vi.mocked(reindexProducts).mockReset();
    vi.mocked(reindexProducts).mockResolvedValue({ indexed: 7, failed: 0 });
  });

  it('reports unconfigured without a connection string', () => {
    expect(isReindexQueueConfigured()).toBe(false);
  });

  it('enqueues a reindex task as JSON', async () => {
    process.env.AZURE_QUEUE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
    const queued = await enqueueReindexTask();

    expect(queued).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSend.mock.calls[0][0] as string);
    expect(payload.action).toBe('reindex');
  });

  it('does not touch the queue when not configured', async () => {
    expect(await enqueueReindexTask()).toBe(false);
    expect(await drainReindexQueue()).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockReceive).not.toHaveBeenCalled();
  });

  it('ensures the queue exists when configured', async () => {
    process.env.AZURE_QUEUE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
    mockCreate.mockResolvedValueOnce({});
    await ensureQueue();
    expect(mockCreate).toHaveBeenCalled();
  });

  it('drains a reindex task and deletes it', async () => {
    process.env.AZURE_QUEUE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
    mockReceive.mockResolvedValueOnce({
      receivedMessageItems: [
        { messageId: 'm1', popReceipt: 'p1', messageText: JSON.stringify({ action: 'reindex' }) },
      ],
    });

    const processed = await drainReindexQueue();

    expect(processed).toBe(1);
    expect(vi.mocked(reindexProducts)).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('m1', 'p1');
  });

  it('deletes malformed messages without invoking reindex', async () => {
    process.env.AZURE_QUEUE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
    mockReceive.mockResolvedValueOnce({
      receivedMessageItems: [{ messageId: 'm2', popReceipt: 'p2', messageText: 'not-json' }],
    });

    const processed = await drainReindexQueue();

    expect(processed).toBe(1);
    expect(vi.mocked(reindexProducts)).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('m2', 'p2');
  });

  it('leaves failed tasks in the queue for retry', async () => {
    process.env.AZURE_QUEUE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
    vi.mocked(reindexProducts).mockRejectedValueOnce(new Error('embedding down'));
    mockReceive.mockResolvedValueOnce({
      receivedMessageItems: [
        { messageId: 'm3', popReceipt: 'p3', messageText: JSON.stringify({ action: 'reindex' }) },
      ],
    });

    const processed = await drainReindexQueue();

    expect(processed).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});