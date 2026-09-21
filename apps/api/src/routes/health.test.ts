import { describe, it, expect } from 'vitest';
import app from '../app.js';

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
});
