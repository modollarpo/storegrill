import webpush from 'web-push';
import { prisma } from '../index.js';
import { PushPayload, payloadToJson } from './push-format.js';

const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:alerts@storegrill.net';
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';

export const pushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

export type { PushPayload };
export { payloadToJson };

async function sendInternal(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<void> {
  if (!pushConfigured) return;
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    payload,
    { TTL: 60 * 60 * 24 },
  );
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number }> {
  if (!pushConfigured) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return sendPushToSubs(subs, payload);
}

export async function sendPushToRegion(regionKey: string, payload: PushPayload): Promise<{ sent: number }> {
  if (!pushConfigured) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { regionKey } });
  return sendPushToSubs(subs, payload);
}

export async function sendPushBroadcast(payload: PushPayload): Promise<{ sent: number }> {
  if (!pushConfigured) return { sent: 0 };
  const subs = await prisma.pushSubscription.findMany();
  return sendPushToSubs(subs, payload);
}

async function sendPushToSubs(
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
): Promise<{ sent: number }> {
  if (subs.length === 0) return { sent: 0 };
  const json = payloadToJson(payload);
  let sent = 0;
  const deadIds: string[] = [];

  for (const sub of subs) {
    try {
      await sendInternal(sub, json);
      sent += 1;
    } catch (error) {
      const code = (error as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        deadIds.push(sub.id);
      }
    }
  }

  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  return { sent };
}