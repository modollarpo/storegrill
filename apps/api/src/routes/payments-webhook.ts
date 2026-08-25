import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { verifyStripeSignature, retrieveStripeSession } from '../payments/providers.js';
import { markCaptured } from '../payments/settlement.js';

const router = Router();

router.post('/webhook/stripe', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'] as string | undefined)) {
    return res.status(400).json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid Stripe signature' } });
  }

  let event: { type?: string; data?: { object?: { id?: string; client_reference_id?: string } } };
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: { code: 'BAD_PAYLOAD', message: 'Unparseable payload' } });
  }

  if (event.type === 'checkout.session.completed' && event.data?.object?.id) {
    const sessionId = event.data.object.id;
    try {
      const session = await retrieveStripeSession(sessionId);
      if (session.paid) {
        const payment = await prisma.payment.findFirst({
          where: { providerPaymentId: sessionId },
        });
        if (payment) await markCaptured(payment.orderId);
      }
    } catch {
      return res.json({ received: true, retry: true });
    }
  }

  res.json({ received: true });
});

export { router as paymentsWebhookRouter };
