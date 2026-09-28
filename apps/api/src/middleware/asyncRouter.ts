import { Router, type IRouter, type RequestHandler } from 'express';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all', 'use'] as const;

type AnyRecord = Record<string, unknown>;

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof (value as Promise<unknown> | null)?.catch === 'function';
}

/**
 * Adapts one handler so that both synchronous throws and promise rejections
 * reach Express' error pipeline.
 *
 * A rejection is only forwarded when nothing has been written yet. A handler
 * that already sent a response and then fails must not trigger a second write,
 * which would otherwise crash the process with ERR_HTTP_HEADERS_SENT and lose
 * the original error.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    let result: unknown;
    try {
      result = handler(req, res, next);
    } catch (err) {
      next(err);
      return;
    }
    if (isPromiseLike(result)) {
      result.catch(err => {
        if (res.headersSent) {
          console.error('[api] async handler rejected after the response was sent', err);
          return;
        }
        next(err);
      });
    }
  };
}

/**
 * A drop-in replacement for `express.Router()` whose handlers cannot hang.
 *
 * Express 4 does not await route handlers, so any `throw` or rejection inside an
 * async handler is swallowed: the request never gets a response and the caller
 * sees a gateway timeout instead of a diagnosable error. Wrapping every handler
 * at registration time means a new route is safe by default, with no per-route
 * discipline to remember.
 */
export function createAsyncRouter(): IRouter {
  const router = Router();
  const target = router as unknown as AnyRecord;

  for (const method of METHODS) {
    const original = target[method] as (...args: unknown[]) => unknown;
    target[method] = (...args: unknown[]) => {
      const wrapped = args.map(arg =>
        typeof arg === 'function' ? asyncHandler(arg as RequestHandler) : arg
      );
      return original.apply(router, wrapped);
    };
  }

  return router;
}
