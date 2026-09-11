import { test, expect } from '@playwright/test';
import { ProductListResponseSchema, ReviewListResponseSchema, validateResponse } from './schemas';

test.describe('API Contracts', () => {
  test('GET /api/v1/products should return valid product list', async ({ request }) => {
    const response = await request.get('/api/v1/products?regionKey=US&limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const result = validateResponse(ProductListResponseSchema, data);

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error('Validation errors:', result.error.errors);
    }
  });

  test('GET /api/v1/reviews/product/:id should return valid review list', async ({ request }) => {
    const response = await request.get('/api/v1/reviews/product/test-product-id');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const result = validateResponse(ReviewListResponseSchema, data);

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error('Validation errors:', result.error.errors);
    }
  });

  test('GET /api/v1/bestsellers should return valid product list', async ({ request }) => {
    const response = await request.get('/api/v1/bestsellers?regionKey=US&limit=6');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test('POST /api/v1/reviews should require authentication', async ({ request }) => {
    const response = await request.post('/api/v1/reviews', {
      data: {
        productId: 'test',
        rating: 5,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /api/v1/orders/checkout should require valid body', async ({ request }) => {
    const response = await request.post('/api/v1/orders/checkout', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});
