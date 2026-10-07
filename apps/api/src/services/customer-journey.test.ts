import { describe, it, expect, beforeEach, vi } from 'vitest';

const { sendMailMock, prismaMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn().mockResolvedValue(undefined),
  prismaMock: { cart: { findMany: vi.fn(), update: vi.fn() }, order: { findMany: vi.fn(), update: vi.fn() } },
}));

vi.mock('../lib/mailer.js', () => ({ sendMail: sendMailMock }));
vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));

const { checkAndSendAbandonedCarts, checkAndSendReviewRequests } = await import('./customer-journey.js');

function cartFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    user: { name: 'Ada', email: 'ada@example.com' },
    items: [
      {
        quantity: 2,
        product: { name: 'Widget', thumbnail: 't.jpg', basePriceMinorUnits: 500, currencyCode: 'GBP', slug: 'widget' },
        variant: null,
      },
    ],
    ...overrides,
  };
}

function orderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'SG-0001',
    user: { name: 'Ada', email: 'ada@example.com' },
    items: [{ name: 'Widget', productId: 'p-1' }],
    ...overrides,
  };
}

describe('checkAndSendAbandonedCarts', () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it('sends one reminder per eligible cart and stamps reminderSentAt before sending', async () => {
    prismaMock.cart.findMany.mockResolvedValue([cartFixture()]);
    prismaMock.cart.update.mockResolvedValue({});

    const sent = await checkAndSendAbandonedCarts(prismaMock as any);

    expect(sent).toBe(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com' }),
    );
    expect(prismaMock.cart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cart-1' },
        data: expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      }),
    );
  });

  it('only queries carts that have never received a reminder', async () => {
    prismaMock.cart.findMany.mockResolvedValue([]);

    await checkAndSendAbandonedCarts(prismaMock as any);

    const where = prismaMock.cart.findMany.mock.calls[0][0].where;
    expect(where.reminderSentAt).toBeNull();
    expect(where.updatedAt.lte).toBeInstanceOf(Date);
  });

  it('never sends twice for the same cart', async () => {
    prismaMock.cart.findMany.mockResolvedValue([cartFixture()]);
    prismaMock.cart.findMany.mockResolvedValueOnce([cartFixture()]).mockResolvedValueOnce([]);
    prismaMock.cart.update.mockResolvedValue({});

    const firstRun = await checkAndSendAbandonedCarts(prismaMock as any);
    const secondRun = await checkAndSendAbandonedCarts(prismaMock as any);

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('returns 0 without emailing when the journey is disabled', async () => {
    const prev = process.env.CUSTOMER_JOURNEY_ENABLED;
    process.env.CUSTOMER_JOURNEY_ENABLED = 'false';
    try {
      const sent = await checkAndSendAbandonedCarts(prismaMock as any);
      expect(sent).toBe(0);
      expect(sendMailMock).not.toHaveBeenCalled();
    } finally {
      if (prev === undefined) delete process.env.CUSTOMER_JOURNEY_ENABLED;
      else process.env.CUSTOMER_JOURNEY_ENABLED = prev;
    }
  });
});

describe('checkAndSendReviewRequests', () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it('sends one review request per delivered order and stamps reviewRequestSentAt', async () => {
    prismaMock.order.findMany.mockResolvedValue([orderFixture()]);
    prismaMock.order.update.mockResolvedValue({});

    const sent = await checkAndSendReviewRequests(prismaMock as any);

    expect(sent).toBe(1);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }));
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ reviewRequestSentAt: expect.any(Date) }),
      }),
    );
  });

  it('only queries orders that have not received a review request', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    await checkAndSendReviewRequests(prismaMock as any);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.reviewRequestSentAt).toBeNull();
  });
});