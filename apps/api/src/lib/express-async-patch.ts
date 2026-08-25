import ExpressLayer from 'express/lib/router/layer';

Object.defineProperty(ExpressLayer.prototype, 'handle', {
  enumerable: true,
  get(this: { __handle?: unknown }) {
    return this.__handle;
  },
  set(this: { __handle?: unknown }, fn: (...args: unknown[]) => unknown) {
    if (fn.length === 4) {
      this.__handle = fn;
    } else {
      this.__handle = (req: unknown, res: unknown, next: (err?: unknown) => void) =>
        Promise.resolve(fn(req, res, next)).catch(next);
    }
  },
});

process.on('unhandledRejection', (reason: unknown) => {
  const detail = reason instanceof Error ? `${reason.name}: ${reason.message}\n${reason.stack}` : String(reason);
  console.error('[unhandledRejection]', detail);
});
