import crypto from 'crypto';
import fetch from 'node-fetch';

export interface MailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const PROVIDER = process.env.MAIL_PROVIDER || 'console';
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@storegrill.net';

function parseConnectionString(connectionString: string): { endpoint: string; accessKey: string } {
  const parts = Object.fromEntries(
    connectionString.split(';').map(pair => {
      const idx = pair.indexOf('=');
      return [pair.slice(0, idx).toLowerCase(), pair.slice(idx + 1)];
    })
  );
  if (!parts.endpoint || !parts.accesskey) {
    throw new Error('ACS_CONNECTION_STRING must contain endpoint and accesskey');
  }
  return { endpoint: parts.endpoint.replace(/\/$/, ''), accessKey: parts.accesskey };
}

function sha256Base64(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('base64');
}

function hmacSha256Base64(key: Buffer, input: string): string {
  return crypto.createHmac('sha256', key).update(input, 'utf8').digest('base64');
}

async function sendViaAcs(message: MailMessage): Promise<void> {
  const cs = process.env.ACS_CONNECTION_STRING;
  if (!cs) throw new Error('ACS_CONNECTION_STRING required when MAIL_PROVIDER=acs');

  const { endpoint, accessKey } = parseConnectionString(cs);
  const pathAndQuery = '/emails:send?api-version=2024-07-01-preview';
  const body = JSON.stringify({
    senderAddress: MAIL_FROM,
    recipients: { to: [{ address: message.to }] },
    content: {
      subject: message.subject,
      plainText: message.text ?? (message.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      ...(message.html ? { html: message.html } : {}),
    },
  });

  const date = new Date().toUTCString();
  const contentHash = sha256Base64(body);
  const signedHeaders = 'host;x-ms-content-sha256;x-ms-date';
  const stringToSign = `POST\n${pathAndQuery}\n${contentHash};${signedHeaders}\n${date}`;
  const signature = hmacSha256Base64(Buffer.from(accessKey, 'base64'), stringToSign);

  const res = await fetch(`${endpoint}${pathAndQuery}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ms-date': date,
      'x-ms-content-sha256': contentHash,
      Authorization: `HMAC-SHA256 SignedHeaders=${signedHeaders}&Signature=${signature}`,
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ACS Email send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (PROVIDER === 'acs') {
    await sendViaAcs(message);
    return;
  }
  console.log(`[mail:${PROVIDER}] to=${message.to} subject="${message.subject}"\n${message.text ?? message.html}`);
}
