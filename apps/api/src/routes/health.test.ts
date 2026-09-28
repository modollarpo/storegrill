import { describe, it, expect } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import app from '../app.js';
import { generateCsrfToken, validateCsrfToken, issueCsrfCookie, csrfProtection } from '../middleware/csrf.js';

function listen(): Promise<{ port: number; close: () => void }> {
  return new Promise(resolve => {
    const server = app.listen(0, () => {
      resolve({
        port: (server.address() as any).port,
        close: () => server.close(),
      });
    });
  });
}

function csrfServer(): Promise<{ port: number; close: () => void }> {
  const bare = express();
  bare.use(cookieParser());
  bare.use(issueCsrfCookie);
  bare.use(csrfProtection);
  bare.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  bare.post('/api/v1/cart/items', (_req, res) => { res.json({ ok: true }); });
  return new Promise(resolve => {
    const server = bare.listen(0, () => {
      resolve({
        port: (server.address() as any).port,
        close: () => server.close(),
      });
    });
  });
}

function readIssuedToken(res: Response): string {
  const raw = res.headers.get('set-cookie') || '';
  const match = /sg_csrf=([^;]+)/.exec(raw);
  if (!match) throw new Error(`no sg_csrf cookie issued; set-cookie was ${JSON.stringify(raw)}`);
  return decodeURIComponent(match[1]);
}

function getNoKeepAlive(port: number, path: string): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, { headers: { connection: 'close' } });
}

describe('Health endpoint', () => {
  it('GET /api/health returns ok', async () => {
    const { port, close } = await listen();
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      const body: any = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    } finally {
      close();
    }
  });
});

describe('CSRF protection', () => {
  it('POST without CSRF token returns 403', async () => {
    const { port, close } = await listen();
    try {
      const res = await fetch(`http://localhost:${port}/api/v1/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'test', quantity: 1 }),
      });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.error).toContain('CSRF');
    } finally {
      close();
    }
  });

  it('GET requests are exempt from CSRF', async () => {
    const { port, close } = await listen();
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      expect(res.status).toBe(200);
    } finally {
      close();
    }
  });

  it('webhook paths are exempt from CSRF', async () => {
    const { port, close } = await listen();
    try {
      const res = await fetch(`http://localhost:${port}/api/v1/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).not.toBe(403);
    } finally {
      close();
    }
  });

  it('issues an sg_csrf cookie to anonymous visitors so guest checkout can proceed', async () => {
    const { port, close } = await listen();
    try {
      const res = await getNoKeepAlive(port, '/api/health');
      console.log('DIAG status', res.status, 'DIAG headers', JSON.stringify([...res.headers.entries()]));
      const token = readIssuedToken(res);
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).not.toContain('HttpOnly');
      expect(validateCsrfToken(token)).toBe(true);
    } finally {
      close();
    }
  });

  it('accepts a mutating request that echoes the issued cookie as x-csrf-token', async () => {
    const { port, close } = await csrfServer();
    try {
      const csrf = readIssuedToken(await getNoKeepAlive(port, '/api/health'));
      const res = await fetch(`http://localhost:${port}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf, cookie: `sg_csrf=${csrf}`, connection: 'close' },
        body: JSON.stringify({ productId: 'test', quantity: 1 }),
      });
      expect(res.status).toBe(200);
    } finally {
      close();
    }
  });

  it('rejects a mutating request whose header does not match the cookie', async () => {
    const { port, close } = await csrfServer();
    try {
      const csrf = readIssuedToken(await getNoKeepAlive(port, '/api/health'));
      const res = await fetch(`http://localhost:${port}/api/v1/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': generateCsrfToken(), cookie: `sg_csrf=${csrf}`, connection: 'close' },
        body: JSON.stringify({ productId: 'test', quantity: 1 }),
      });
      expect(res.status).toBe(403);
    } finally {
      close();
    }
  });
});
