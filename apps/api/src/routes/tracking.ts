import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  if (!shipment) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Shipment not found' } });
  }

  res.json({ shipment });
});

export { router as trackingRouter };
