import app from './app.js';
export { prisma } from './db/prisma.js';
import { prisma } from './db/prisma.js';
import { logger } from './lib/logger.js';
import { initAIModels } from './services/ai-gateway.js';
import { ensureSearchIndex } from './services/ai-search.js';

const PORT = process.env.PORT || 3001;

async function provisionSchema() {
  if (process.env.AUTO_SCHEMA_SYNC === '0') return;
  const { execSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), '../prisma/schema.prisma');
  try {
    logger.info('Syncing database schema...');
    execSync(`npx prisma db push --skip-generate --schema="${schemaPath}"`, {
      stdio: 'inherit',
      env: { ...process.env },
    });
    logger.info('Database schema synced');
  } catch (error) {
    logger.error({ err: error }, 'Schema sync failed, continuing anyway');
  }
}

async function bootstrap() {
  try {
    await provisionSchema();
    await prisma.$connect();
    logger.info('Database connected');
    initAIModels(prisma).catch(error =>
      logger.error({ err: error }, 'AI model init failed'),
    );
    ensureSearchIndex(prisma).catch(error =>
      logger.error({ err: error }, 'Search index ensure failed'),
    );
    const { ensureQueue, drainReindexQueue, isReindexQueueConfigured } =
      await import('./services/reindex-queue.js');
    if (isReindexQueueConfigured()) {
      ensureQueue().catch(error =>
        logger.error({ err: error }, 'Reindex queue ensure failed'),
      );
      setInterval(() => {
        drainReindexQueue(prisma).catch(error =>
          logger.error({ err: error }, 'Reindex queue drain failed'),
        );
      }, 30_000).unref();
    }
    if (process.env.DISABLE_IMPORT_WORKER !== '1') {
      const { startScheduler } = await import('./services/scheduler.js');
      startScheduler(prisma);
    }
    app.listen(PORT, () => {
      logger.info({ port: PORT }, `API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
