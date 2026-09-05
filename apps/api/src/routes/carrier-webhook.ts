import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { parseCarrierEvents, applyTrackingEvents } from '../services/carriers.js';
import { normalizeCarrierProvider } from '@Storegrill/shared';
import type { Request } from 'express';

const router = Router();

function webhookSecret(): string {
  const configured = process.env.TRACKING_WEBHOOK_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TRACKING_WEBHOOK_SECRET is required in production');
  }
  return 'dev-tracking-webhook-secret-do-not-use-in-production';
}

const AUTO_INGEST_SCHEMA = z.object({
  shipmentId: z.string().optional(),
});

router.post('/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const supplied = z
    .object({
      secret: z.string().optional(),
    })
    .parse(req.body ?? {});
  const header = typeof req.headers['x-tracking-secret'] === 'string' ? req.headers['x-tracking-secret'] : undefined;
  const token = header ?? supplied.secret;
  if (!token || token !== webhookSecret()) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid tracking webhook secret' } });
  }

  let events;
  try {
    const parsed = parseCarrierEvents(provider, req.body);
    events = parsed.events;
  } catch (error) {
    return res.status(400).json({
      error: { code: 'INVALID_PAYLOAD', message: error instanceof Error ? error.message : 'Malformed tracking payload' },
    });
  }

  const body = (req.body ?? {}) as {
    shipmentId?: string;
    trackingNumber?: string;
    orderNumber?: string;
  };

  const auto = AUTO_INGEST_SCHEMA.safeParse(body);
  const shipmentId = auto.success && auto.data.shipmentId ? auto.data.shipmentId : undefined;

  const shipment = shipmentId
    ? await prisma.shipment.findUnique({ where: { id: shipmentId } })
    : body.trackingNumber
      ? await matchShipmentByTracking(body.trackingNumber, provider)
      : body.orderNumber
        ? await (async () => {
            const order = await prisma.order.findUnique({ where: { orderNumber: body.orderNumber } });
            if (!order) return null;
            return prisma.shipment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
          })()
        : null;

  if (!shipment) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'No shipment matched the tracking number, order number, or shipment id' },
    });
  }

  try {
    const result = await applyTrackingEvents(shipment.id, events, { agency: provider });
    return res.json({ received: 'ok', result });
  } catch (error) {
    return res.status(500).json({
      error: { code: 'INGEST_FAILED', message: error instanceof Error ? error.message : 'Tracking ingest failed' },
    });
  }
});

async function matchShipmentByTracking(trackingNumber: string, provider: string) {
  const candidates = await prisma.shipment.findMany({
    where: { trackingNumber },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  if (candidates.length === 0) return null;
  const wantedProvider = normalizeCarrierProvider(provider);
  const exact = candidates.find(candidate => normalizeCarrierProvider(candidate.carrier) === wantedProvider);
  return exact ?? candidates[0];
}

export { router as carrierWebhookRouter };