import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import {
  verifyStripeSignature,
  retrieveStripeSession,
  verifyPaypalWebhook,
  capturePaypalOrder,
  type PaypalWebhookHeaders,
} from '../payments/providers.js';
import { markCaptured } from '../payments/settlement.js';

const router = Router();

// ─── Stripe ───────────────────────────────────────────────────────────────────

router.post('/webhook/stripe', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'] as string | undefined)) {
    return res.status(400).json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid Stripe signature' } });
  }

  let event: {
    type?: string;
    data?: {
      object?: {
        id?: string;
        client_reference_id?: string;
        charge?: string;
        refund?: { amount?: number; currency?: string };
        dispute?: { id?: string; reason?: string };
      };
    };
  };

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: { code: 'BAD_PAYLOAD', message: 'Unparseable payload' } });
  }

  const obj = event.data?.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const sessionId = obj?.id;
        if (!sessionId) break;
        const session = await retrieveStripeSession(sessionId);
        if (session.paid) {
          const payment = await prisma.payment.findFirst({
            where: { providerPaymentId: sessionId },
          });
          if (payment) await markCaptured(payment.orderId);
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const sessionId = obj?.id;
        if (!sessionId) break;
        await prisma.payment.updateMany({
          where: { providerPaymentId: sessionId },
          data: { status: 'FAILED' },
        });
        break;
      }

      case 'charge.refunded': {
        const chargeId = obj?.id;
        if (!chargeId) break;
        const payment = await prisma.payment.findFirst({ where: { providerPaymentId: chargeId } });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED' },
          });
        }
        break;
      }

      case 'charge.dispute.created': {
        const chargeId = obj?.charge;
        if (!chargeId) break;
        const payment = await prisma.payment.findFirst({ where: { providerPaymentId: chargeId } });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'DISPUTED' },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch {
    return res.json({ received: true, retry: true });
  }

  res.json({ received: true });
});

// ─── PayPal ───────────────────────────────────────────────────────────────────

router.post('/webhook/paypal', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;

  const headers: PaypalWebhookHeaders = {
    transmissionId:   req.headers['paypal-transmission-id'] as string | undefined,
    transmissionTime: req.headers['paypal-transmission-time'] as string | undefined,
    certUrl:          req.headers['paypal-cert-url'] as string | undefined,
    authAlgo:         req.headers['paypal-auth-algo'] as string | undefined,
    transmissionSig:  req.headers['paypal-transmission-sig'] as string | undefined,
  };

  const valid = await verifyPaypalWebhook(rawBody, headers);
  if (!valid) {
    return res.status(400).json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid PayPal webhook signature' } });
  }

  let event: {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      purchase_units?: Array<{ reference_id?: string; custom_id?: string }>;
      supplementary_data?: { related_ids?: { order_id?: string } };
      invoice_id?: string;
      dispute_id?: string;
    };
  };

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: { code: 'BAD_PAYLOAD', message: 'Unparseable payload' } });
  }

  const resource = event.resource;

  function orderNumberFrom(): string | null {
    if (!resource) return null;
    const units = resource.purchase_units;
    if (units?.length) return units[0].custom_id || units[0].reference_id || null;
    return resource.custom_id || resource.supplementary_data?.related_ids?.order_id || null;
  }

  try {
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        // Buyer approved — attempt server-side capture
        const paypalOrderId = resource?.id;
        if (!paypalOrderId) break;
        const result = await capturePaypalOrder(paypalOrderId);
        if (result.completed) {
          const payment = await prisma.payment.findFirst({
            where: { providerPaymentId: paypalOrderId },
          });
          if (payment) await markCaptured(payment.orderId);
        }
        break;
      }

      case 'CHECKOUT.ORDER.COMPLETED':
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const paypalOrderId =
          resource?.id ||
          resource?.supplementary_data?.related_ids?.order_id;
        if (!paypalOrderId) break;
        const payment = await prisma.payment.findFirst({
          where: { providerPaymentId: paypalOrderId },
        });
        if (payment) await markCaptured(payment.orderId);
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED': {
        const paypalOrderId =
          resource?.supplementary_data?.related_ids?.order_id || resource?.id;
        if (!paypalOrderId) break;
        await prisma.payment.updateMany({
          where: { providerPaymentId: paypalOrderId },
          data: { status: 'FAILED' },
        });
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const paypalOrderId =
          resource?.supplementary_data?.related_ids?.order_id || resource?.id;
        if (!paypalOrderId) break;
        await prisma.payment.updateMany({
          where: { providerPaymentId: paypalOrderId },
          data: { status: 'REFUNDED' },
        });
        break;
      }

      case 'CUSTOMER.DISPUTE.CREATED': {
        const orderNumber = orderNumberFrom();
        if (!orderNumber) break;
        const order = await prisma.order.findFirst({ where: { orderNumber } });
        if (order) {
          await prisma.payment.updateMany({
            where: { orderId: order.id },
            data: { status: 'DISPUTED' },
          });
        }
        break;
      }

      case 'CUSTOMER.DISPUTE.RESOLVED': {
        const orderNumber = orderNumberFrom();
        if (!orderNumber) break;
        const order = await prisma.order.findFirst({ where: { orderNumber } });
        if (order) {
          await prisma.payment.updateMany({
            where: { orderId: order.id, status: 'DISPUTED' },
            data: { status: 'CAPTURED' },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch {
    return res.json({ received: true, retry: true });
  }

  res.json({ received: true });
});

export { router as paymentsWebhookRouter };

