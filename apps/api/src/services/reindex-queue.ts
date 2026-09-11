import { QueueClient, QueueServiceClient } from '@azure/storage-queue';
import type { PrismaClient } from '@prisma/client';
import { prisma as db } from '../db/prisma.js';
import { reindexProducts } from './ai-search.js';

const QUEUE_NAME = process.env.AZURE_QUEUE_NAME || 'search-reindex';

export function isReindexQueueConfigured(): boolean {
  return Boolean(process.env.AZURE_QUEUE_CONNECTION_STRING);
}

function queueClient(): QueueClient | undefined {
  const connectionString = process.env.AZURE_QUEUE_CONNECTION_STRING;
  if (!connectionString) return undefined;
  return QueueServiceClient.fromConnectionString(connectionString).getQueueClient(QUEUE_NAME);
}

export async function ensureQueue(): Promise<void> {
  const client = queueClient();
  if (!client) return;
  await client.createIfNotExists();
}

export async function enqueueReindexTask(): Promise<boolean> {
  const client = queueClient();
  if (!client) return false;
  await client.sendMessage(JSON.stringify({ action: 'reindex', at: new Date().toISOString() }));
  return true;
}

async function processTask(messageText: string, prisma: PrismaClient): Promise<void> {
  let task: { action?: string };
  try {
    task = JSON.parse(messageText);
  } catch {
    return;
  }
  if (task.action === 'reindex') {
    const result = await reindexProducts(prisma);
    console.log(`[reindex-queue] reindex complete: ${result.indexed} indexed, ${result.failed} failed`);
  }
}

export async function drainReindexQueue(prisma: PrismaClient = db): Promise<number> {
  const client = queueClient();
  if (!client) return 0;

  let processed = 0;
  const received = await client.receiveMessages({ numberOfMessages: 32, visibilityTimeout: 300 });
  for (const item of received.receivedMessageItems) {
    try {
      await processTask(item.messageText, prisma);
      await client.deleteMessage(item.messageId, item.popReceipt);
      processed += 1;
    } catch (error) {
      console.error(
        '[reindex-queue] task failed (message will retry after visibility timeout):',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return processed;
}