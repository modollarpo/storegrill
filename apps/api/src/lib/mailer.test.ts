import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('node-fetch', () => ({ default: fetchMock }));

async function loadMailer(env: Record<string, string>) {
  for (const key of Object.keys(process.env)) {
    if (key === 'MAIL_PROVIDER' || key === 'MAIL_FROM' || key === 'ACS_CONNECTION_STRING') {
      delete process.env[key];
    }
  }
  Object.assign(process.env, env);
  vi.resetModules();
  return (await import('./mailer.js')) as typeof import('./mailer.js');
}

describe('mailer', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('parses an ACS connection string', async () => {
    const { parseConnectionString } = await loadMailer({});
    const parsed = parseConnectionString('endpoint=https://x.communication.azure.com/;accesskey=YWJj');
    expect(parsed.endpoint).toBe('https://x.communication.azure.com');
    expect(parsed.accessKey).toBe('YWJj');
  });

  it('rejects a connection string without endpoint or accesskey', async () => {
    const { parseConnectionString } = await loadMailer({});
    expect(() => parseConnectionString('endpoint=https://x.communication.azure.com/')).toThrow(
      'must contain endpoint and accesskey',
    );
  });

  it('logs to console when provider is console', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => logs.push(args.join(' ')));
    const { sendMail } = await loadMailer({ MAIL_PROVIDER: 'console' });

    await sendMail({ to: 'a@b.c', subject: 'S', text: 'T' });

    expect(logs.some(line => line.includes('to=a@b.c') && line.includes('subject="S"'))).toBe(true);
    spy.mockRestore();
  });

  it('sends through ACS Email with an HMAC signature when provider is acs', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const { sendMail } = await loadMailer({
      MAIL_PROVIDER: 'acs',
      MAIL_FROM: 'DoNotReply@storegrill.net',
      ACS_CONNECTION_STRING: 'endpoint=https://x.communication.azure.com/;accesskey=YWJjY2Rl',
    });

    await sendMail({ to: 'a@b.c', subject: 'Sub', html: '<p>Hi</p>' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: { [k: string]: string }; body: string },
    ];
    expect(String(url)).toContain('/emails:send?api-version=2024-07-01-preview');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['x-ms-date']).toBeDefined();
    expect(init.headers.Authorization).toMatch(/^HMAC-SHA256 SignedHeaders=host;x-ms-content-sha256;x-ms-date&/);
    const body = JSON.parse(init.body);
    expect(body.senderAddress).toBe('DoNotReply@storegrill.net');
    expect(body.content.subject).toBe('Sub');
    expect(body.recipients.to).toEqual([{ address: 'a@b.c' }]);
  });

  it('throws when the ACS Email request fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
    const { sendMail } = await loadMailer({
      MAIL_PROVIDER: 'acs',
      MAIL_FROM: 'DoNotReply@storegrill.net',
      ACS_CONNECTION_STRING: 'endpoint=https://x.communication.azure.com/;accesskey=YWJjY2Rl',
    });

    await expect(sendMail({ to: 'a@b.c', subject: 'Sub' })).rejects.toThrow('ACS Email send failed');
  });
});