import { Router, Request, Response } from 'express';

const router = Router();

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Storegrill Multi-Region Marketplace API',
      version: '1.0.0',
      description: 'Enterprise multi-region marketplace REST API with regional pods, inventory, orders, payments, shipping, deals, carriers, ledger, and merchant intelligence.',
    },
    servers: [
      { url: 'http://localhost:3001/api/v1', description: 'Local Development Server' },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/orders': {
        get: { summary: 'List orders' },
        post: { summary: 'Create order' },
      },
      '/products': {
        get: { summary: 'List products' },
      },
      '/vendors': {
        get: { summary: 'List vendors' },
      },
      '/deals': {
        get: { summary: 'List active deals' },
        post: { summary: 'Evaluate deal valuation' },
      },
      '/tracking/{id}': {
        get: { summary: 'Get shipment tracking' },
      },
      '/returns': {
        get: { summary: 'List return requests' },
        post: { summary: 'Create return request' },
      },
      '/disputes': {
        get: { summary: 'List disputes' },
        post: { summary: 'Open dispute' },
      },
      '/marketing/campaigns': {
        get: { summary: 'List marketing campaigns' },
        post: { summary: 'Create marketing campaign' },
      },
    },
  });
});

export { router as openApiRouter };
