import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.type('html').send(`<!DOCTYPE html>
<html><head><title>Storegrill API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/v1/docs/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script>
</body></html>`);
});

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Storegrill Multi-Region Marketplace API',
      version: '1.0.0',
      description: 'Enterprise multi-region marketplace REST API with regional pods, inventory, orders, payments, shipping, deals, carriers, ledger, search, i18n, and merchant intelligence.',
      contact: { name: 'Storegrill Support', email: 'support@storegrill.net' },
    },
    servers: [
      { url: 'https://uk-api.storegrill.net/api/v1', description: 'UK Production' },
      { url: 'https://us-api.storegrill.net/api/v1', description: 'US Production' },
      { url: 'https://eu-api.storegrill.net/api/v1', description: 'EU Production' },
      { url: 'http://localhost:3001/api/v1', description: 'Local Development' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sg_access_token' },
        csrfHeader: { type: 'apiKey', in: 'header', name: 'x-csrf-token', description: 'CSRF double-submit token. Read from sg_csrf cookie and send back as header on mutating requests.' },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            thumbnail: { type: 'string', format: 'uri' },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
            status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'] },
            categoryId: { type: 'string' },
            brandId: { type: 'string' },
            vendorId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] },
            totalMinorUnits: { type: 'integer' },
            currencyCode: { type: 'string', example: 'GBP' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            priceMinorUnits: { type: 'integer' },
          },
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'PENDING', 'SUSPENDED'] },
          },
        },
        Deal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['PERCENTAGE', 'FIXED', 'BUY_X_GET_Y', 'FLASH'] },
            value: { type: 'number' },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
      },
    },
    security: [{ cookieAuth: [], csrfHeader: [] }],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          security: [],
          responses: { '200': { description: 'Service healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } } } } } },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register new account',
          tags: ['Auth'],
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'Account created' }, '400': { description: 'Validation error' } },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Sign in',
          tags: ['Auth'],
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'Signed in, sets access_token + refresh_token cookies + sg_csrf cookie' }, '401': { description: 'Invalid credentials' } },
        },
      },
      '/auth/refresh': {
        post: {
          summary: 'Refresh access token',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'New access token' }, '401': { description: 'Invalid refresh token' } },
        },
      },
      '/products': {
        get: {
          summary: 'List products',
          tags: ['Products'],
          security: [],
          parameters: [
            { name: 'regionKey', in: 'query', schema: { type: 'string', default: 'UK' } },
            { name: 'categoryId', in: 'query', schema: { type: 'string' } },
            { name: 'brandId', in: 'query', schema: { type: 'string' } },
            { name: 'vendorId', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'name'] } },
          ],
          responses: { '200': { description: 'Product list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } },
        },
      },
      '/products/{id}': {
        get: {
          summary: 'Get product by ID',
          tags: ['Products'],
          security: [],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Product detail' }, '404': { description: 'Not found' } },
        },
      },
      '/categories': {
        get: {
          summary: 'List categories',
          tags: ['Categories'],
          security: [],
          responses: { '200': { description: 'Category tree' } },
        },
      },
      '/search': {
        get: {
          summary: 'Search products',
          tags: ['Search'],
          security: [],
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 1 } },
            { name: 'regionKey', in: 'query', schema: { type: 'string', default: 'UK' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
            { name: 'mode', in: 'query', schema: { type: 'string', enum: ['hybrid', 'vector', 'keyword'], default: 'hybrid' } },
          ],
          responses: { '200': { description: 'Search results with facets' } },
        },
      },
      '/cart': {
        get: {
          summary: 'Get cart',
          tags: ['Cart'],
          responses: { '200': { description: 'Cart contents' } },
        },
        post: {
          summary: 'Add to cart',
          tags: ['Cart'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['productId', 'quantity'], properties: { productId: { type: 'string' }, quantity: { type: 'integer', minimum: 1 } } } } },
          },
          responses: { '200': { description: 'Item added' }, '400': { description: 'Invalid request' } },
        },
      },
      '/orders': {
        get: {
          summary: 'List orders',
          tags: ['Orders'],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { '200': { description: 'Order list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } },
        },
        post: {
          summary: 'Create order from cart',
          tags: ['Orders'],
          responses: { '201': { description: 'Order created' } },
        },
      },
      '/orders/{id}': {
        get: {
          summary: 'Get order details',
          tags: ['Orders'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Order detail' }, '404': { description: 'Not found' } },
        },
      },
      '/vendors': {
        get: {
          summary: 'List vendors',
          tags: ['Vendors'],
          security: [],
          responses: { '200': { description: 'Vendor list' } },
        },
      },
      '/deals': {
        get: {
          summary: 'List active deals',
          tags: ['Deals'],
          security: [],
          responses: { '200': { description: 'Active deals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Deal' } } } } } },
        },
      },
      '/payments': {
        post: {
          summary: 'Initiate payment',
          tags: ['Payments'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['orderId', 'method'], properties: { orderId: { type: 'string' }, method: { type: 'string', enum: ['stripe', 'paypal'] } } } } },
          },
          responses: { '200': { description: 'Payment intent created' } },
        },
      },
      '/payments/webhook': {
        post: {
          summary: 'Payment provider webhook (CSRF-exempt)',
          tags: ['Payments'],
          security: [],
          responses: { '200': { description: 'Webhook processed' } },
        },
      },
      '/shipping/quote': {
        post: {
          summary: 'Get shipping quote',
          tags: ['Shipping'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['items', 'address'], properties: { items: { type: 'array' }, address: { type: 'object' } } } } },
          },
          responses: { '200': { description: 'Shipping quotes' } },
        },
      },
      '/tracking/{id}': {
        get: {
          summary: 'Get shipment tracking',
          tags: ['Tracking'],
          security: [],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Tracking events' }, '404': { description: 'Not found' } },
        },
      },
      '/i18n/translate': {
        post: {
          summary: 'Translate text batch',
          tags: ['i18n'],
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['texts', 'targetLang'], properties: { texts: { type: 'array', items: { type: 'string' }, maxItems: 100 }, sourceLang: { type: 'string', default: 'en', minLength: 2, maxLength: 2 }, targetLang: { type: 'string', minLength: 2, maxLength: 2 } } } } },
          },
          responses: { '200': { description: 'Translated texts' } },
        },
      },
      '/returns': {
        get: {
          summary: 'List return requests',
          tags: ['Returns'],
          responses: { '200': { description: 'Return list' } },
        },
        post: {
          summary: 'Create return request',
          tags: ['Returns'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['orderId', 'reason'], properties: { orderId: { type: 'string' }, reason: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'Return created' } },
        },
      },
      '/disputes': {
        get: {
          summary: 'List disputes',
          tags: ['Disputes'],
          responses: { '200': { description: 'Dispute list' } },
        },
        post: {
          summary: 'Open dispute',
          tags: ['Disputes'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['orderId', 'reason'], properties: { orderId: { type: 'string' }, reason: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'Dispute opened' } },
        },
      },
      '/blog': {
        get: {
          summary: 'List blog posts',
          tags: ['Blog'],
          security: [],
          responses: { '200': { description: 'Blog posts' } },
        },
      },
      '/marketing/campaigns': {
        get: {
          summary: 'List marketing campaigns',
          tags: ['Marketing'],
          responses: { '200': { description: 'Campaign list' } },
        },
        post: {
          summary: 'Create marketing campaign',
          tags: ['Marketing'],
          responses: { '201': { description: 'Campaign created' } },
        },
      },
      '/admin/products': {
        get: {
          summary: 'Admin: list all products',
          tags: ['Admin'],
          responses: { '200': { description: 'All products including drafts' } },
        },
      },
      '/imports': {
        get: {
          summary: 'List import jobs',
          tags: ['Imports'],
          responses: { '200': { description: 'Import job history' } },
        },
        post: {
          summary: 'Start import job',
          tags: ['Imports'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['vendorKey'], properties: { vendorKey: { type: 'string' }, dryRun: { type: 'boolean', default: false } } } } },
          },
          responses: { '202': { description: 'Import started' } },
        },
      },
    },
  });
});

export { router as openApiRouter };
