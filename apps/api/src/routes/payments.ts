import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { capturePaypalOrder, retrieveStripeSession } from '../payments/providers.js';
import { markCaptured } from '../payments/settlement.js';
import { createAsyncRouter } from '../middleware/asyncRouter.js';

const router = createAsyncRouter();

router.use(authenticate);

const stripeSettleSchema = z.object({ sessionId: z.string().min(4) });

router.post('/stripe/settle', async (req: AuthRequest, res: Response) => {
  const { sessionId } = stripeSettleSchema.parse(req.body);

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: sessionId, order: { userId: req.user!.id } },
  });
  if (!payment) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  }
  if (payment.status === 'CAPTURED') {
    return res.json({ settled: true });
  }

  const session = await retrieveStripeSession(sessionId);
  if (!session.paid) {
    return res.json({ settled: false });
  }

  await markCaptured(payment.orderId);
  res.json({ settled: true });
});

const paypalCaptureSchema = z.object({ paypalOrderId: z.string().min(4) });

router.post('/paypal/capture', async (req: AuthRequest, res: Response) => {
  const { paypalOrderId } = paypalCaptureSchema.parse(req.body);

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paypalOrderId, order: { userId: req.user!.id } },
  });
  if (!payment) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  }
  if (payment.status === 'CAPTURED') {
    return res.json({ captured: true });
  }

  const result = await capturePaypalOrder(paypalOrderId);
  if (!result.completed) {
    return res.status(402).json({
      error: { code: 'PAYMENT_NOT_COMPLETED', message: 'PayPal reported the payment was not completed' },
    });
  }

  await markCaptured(payment.orderId);
  res.json({ captured: true });
});

export { router as paymentsRouter };
