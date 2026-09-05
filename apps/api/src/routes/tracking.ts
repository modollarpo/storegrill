import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { statusLabel } from '../services/carriers.js';
import { carrierDisplayName, normalizeCarrierProvider, type CarrierShipmentStatusValue } from '@Storegrill/shared';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id },
    include: { events: { orderBy: { timestamp: 'desc' } } },
  });

  if (!shipment) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Shipment not found' } });
  }

  res.json({ shipment: toPublicShipment(shipment) });
});

router.get('/by-order/:orderNumber', async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    include: {
      shipments: {
        orderBy: { createdAt: 'desc' },
        include: { events: { orderBy: { timestamp: 'desc' } } },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }

  res.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      shipments: order.shipments.map(toPublicShipment),
    },
  });
});

function toPublicShipment(shipment: {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  status: string;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  events: Array<{ status: string; location: string | null; description: string | null; timestamp: Date }>;
}) {
  return {
    id: shipment.id,
    carrier: carrierDisplayName(shipment.carrier),
    carrierCode: normalizeCarrierProvider(shipment.carrier),
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    statusLabel: statusLabel(shipment.status as CarrierShipmentStatusValue),
    estimatedDelivery: shipment.estimatedDelivery,
    actualDelivery: shipment.actualDelivery,
    events: shipment.events.map(event => ({
      status: event.status,
      location: event.location,
      description: event.description,
      timestamp: event.timestamp,
    })),
  };
}

export { router as trackingRouter };