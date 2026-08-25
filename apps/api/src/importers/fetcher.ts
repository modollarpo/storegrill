import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lookup } from 'node:dns/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const MAX_FEED_BYTES = 100 * 1024 * 1024;
const RETRIES = 3;

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p))) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.includes(':')) {
    const bare = lower.replace(/^\[|\]$/g, '');
    return (
      bare === '::' || bare === '::1' ||
      bare.startsWith('fc') || bare.startsWith('fd') || bare.startsWith('fe80')
    );
  }
  return isPrivateIpv4(lower);
}

export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchError(`Invalid feed URL: ${rawUrl}`);
  }
  if (url.protocol !== 'https:') {
    throw new FetchError('Feed URL must use https');
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => {
    throw new FetchError(`Feed host does not resolve: ${url.hostname}`);
  });
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new FetchError(`Feed host resolves to a private address: ${url.hostname}`);
    }
  }
  return url;
}

export interface FeedFetchResult {
  filePath: string;
  etag: string | null;
  unchanged: boolean;
}

export async function fetchFeedToFile(
  rawUrl: string,
  opts?: { etag?: string | null; jobId?: string },
): Promise<FeedFetchResult> {
  const url = await assertPublicHttpsUrl(rawUrl);

  const dir = join(tmpdir(), 'storegrill-imports');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `feed-${opts?.jobId ?? Date.now()}.csv`);

  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'StoreGrill-Import/1.0',
          ...(opts?.etag ? { 'If-None-Match': opts.etag } : {}),
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30 * 60 * 1000),
      });

      if (response.status === 304) {
        return { filePath, etag: opts?.etag ?? null, unchanged: true };
      }
      if (!response.ok) {
        throw new FetchError(`Feed request failed with HTTP ${response.status}`);
      }

      const declaredLength = Number(response.headers.get('content-length') ?? '0');
      if (declaredLength > MAX_FEED_BYTES) {
        throw new FetchError(`Feed exceeds maximum size of ${MAX_FEED_BYTES} bytes`);
      }

      const etag = response.headers.get('etag');
      const body = response.body;
      if (!body) throw new FetchError('Feed response had no body');

      let received = 0;
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (received > MAX_FEED_BYTES) {
            controller.error(new FetchError(`Feed exceeds maximum size of ${MAX_FEED_BYTES} bytes`));
            return;
          }
          controller.enqueue(chunk);
        },
      });

      await pipeline(
        Readable.fromWeb(body.pipeThrough(counter) as never),
        createWriteStream(filePath),
      );

      return { filePath, etag, unchanged: false };
    } catch (error) {
      lastError = error;
      if (error instanceof FetchError && /exceeds maximum size|HTTP 4/.test(error.message)) throw error;
      if (attempt < RETRIES) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  await unlink(filePath).catch(() => undefined);
  throw lastError instanceof Error ? lastError : new FetchError('Feed download failed');
}

async function assertPublicFtpHost(hostname: string): Promise<void> {
  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => {
    throw new FetchError(`Feed host does not resolve: ${hostname}`);
  });
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new FetchError(`Feed host resolves to a private address: ${hostname}`);
    }
  }
}

export async function ftpFetchToFile(
  rawUrl: string,
  opts?: { jobId?: string },
): Promise<FeedFetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchError(`Invalid feed URL: ${rawUrl}`);
  }
  if (url.protocol !== 'ftp:') {
    throw new FetchError('FTP feed URL must use ftp');
  }
  await assertPublicFtpHost(url.hostname);

  const dir = join(tmpdir(), 'storegrill-imports');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `feed-${opts?.jobId ?? Date.now()}.csv`);

  const user = process.env.FRAGRANCEX_FTP_USER || url.username || 'anonymous';
  const pass = process.env.FRAGRANCEX_FTP_PASSWORD || url.password || '';
  const curlBin = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const args = [
    '-s',
    '--connect-timeout', '30',
    '--max-time', '1800',
    '--user', `${user}:${pass}`,
    '-o', filePath,
    `ftp://${url.host}${url.pathname}`,
  ];

  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await execFileAsync(curlBin, args, { timeout: 1_900_000, windowsHide: true });
      const info = await stat(filePath);
      if (info.size === 0) throw new FetchError('FTP feed download was empty');
      if (info.size > MAX_FEED_BYTES) throw new FetchError(`Feed exceeds maximum size of ${MAX_FEED_BYTES} bytes`);
      return { filePath, etag: null, unchanged: false };
    } catch (error) {
      lastError = error;
      await unlink(filePath).catch(() => undefined);
      if (error instanceof FetchError && /exceeds maximum size/.test(error.message)) throw error;
      if (attempt < RETRIES) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new FetchError('FTP feed download failed');
}
