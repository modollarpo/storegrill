import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import { ZodError, z } from 'zod';
import { createAsyncRouter } from './asyncRouter.js';
import { errorHandler } from './errorHandler.js';

function listen(app: Express): Promise<{ port: number; close: () => void }> {
  return new Promise(resolve => {
    const server = app.listen(0, () => {
      resolve({ port: (server.address() as { port: number }).port, close: () => server.close() });
    });
  });
}

async function withServer(
  register: (router: ReturnType<typeof createAsyncRouter>) => void,
  run: (port: number) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(express.json());
  const router = createAsyncRouter();
  register(router);
  app.use(router);
  app.use(errorHandler);
  const { port, close } = await listen(app);
  try {
    await run(port);
  } finally {
    close();
  }
}

/**
 * Regression guard for the defect that made checkout unusable.
 *
 * Express 4 never awaits route handlers, so a rejection inside an async handler
 * does not reach the error middleware. The request never responds, the gateway
 * eventually returns a 502/504 body without CORS headers, the browser cannot
 * read it, and `fetch` rejects with a non-ApiError. The storefront then shows a
 * generic "something went wrong" with no diagnosis and no server-side clue.
 *
 * Every async route must therefore forward rejections to the error handler.
 */
describe('createAsyncRouter', () => {
  it('forwards a schema rejection from an async handler to the error middleware', async () => {
    const Payload = z.object({ paymentMethod: z.enum(['card', 'paypal', 'cod']) });
    await withServer(
      router => {
        router.post('/checkout', async (req, res) => {
          res.json(Payload.parse(req.body));
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/checkout`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paymentMethod: 'stripe' }),
        });
        expect(res.status).toBe(400);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    );
  });

  it('reports an unexpected throw as a 500 instead of hanging', async () => {
    await withServer(
      router => {
        router.get('/boom', async () => {
          throw new Error('db exploded');
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/boom`);
        expect(res.status).toBe(500);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('INTERNAL_ERROR');
      }
    );
  });

  it('forwards explicit next(err) calls unchanged', async () => {
    await withServer(
      router => {
        router.get('/next', async (_req, _res, next) => {
          next(new ZodError([]));
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/next`);
        expect(res.status).toBe(400);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    );
  });

  it('leaves middleware and sync handlers working', async () => {
    await withServer(
      router => {
        router.use((_req, _res, next) => next());
        router.get('/sync', (_req, res) => {
          res.json({ ok: true });
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/sync`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
      }
    );
  });

  it('does not double-send when a handler responds and then rejects', async () => {
    await withServer(
      router => {
        router.get('/late', async (_req, res) => {
          res.json({ ok: true });
          throw new Error('too late');
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/late`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
      }
    );
  });

  it('wraps middleware-style handlers passed to use()', async () => {
    const reached: string[] = [];
    await withServer(
      router => {
        router.use(async (_req, _res, next) => {
          reached.push('mw');
          next();
        });
        router.get('/after', (_req, res) => {
          res.json({ reached });
        });
      },
      async port => {
        const res = await fetch(`http://localhost:${port}/after`);
        expect(res.status).toBe(200);
      }
    );
  });

  /**
   * A default `import Router from 'express'` resolves to the application
   * factory under CommonJS interop, so every "router" was really a sub-app.
   * Sub-apps still route, which is why this failed silently, but Express mounts
   * them through `mounted_app` and they grow their own settings, breaking the
   * middleware-ordering invariant the CSRF guard depends on.
   */
  it('returns a real Router, not an application', () => {
    const router = createAsyncRouter() as unknown as Record<string, unknown>;

    expect(typeof router.handle).toBe('function');
    expect(router.set).toBeUndefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });
});
