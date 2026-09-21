import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import oauthRouter from './routes/auth-oauth.js';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { vendorsRouter } from './routes/vendors.js';
import { dealsRouter } from './routes/deals.js';
import { regionsRouter } from './routes/regions.js';
import { importsRouter } from './routes/imports.js';
import { reviewsRouter } from './routes/reviews.js';
import { adminRouter } from './routes/admin.js';
import { i18nRouter } from './routes/i18n.js';
import { paymentsRouter } from './routes/payments.js';
import { paymentsWebhookRouter } from './routes/payments-webhook.js';
import { categoriesRouter } from './routes/categories.js';
import { homeRouter } from './routes/home.js';
import { brandsRouter } from './routes/brands.js';
import { searchRouter } from './routes/search.js';
import { notificationsRouter } from './routes/notifications.js';
import { pushRouter } from './routes/push.js';
import { shippingRouter } from './routes/shipping.js';
import { trackingRouter } from './routes/tracking.js';
import { carrierWebhookRouter } from './routes/carrier-webhook.js';
import { taxRouter } from './routes/tax.js';
import { blogRouter } from './routes/blog.js';
import { newsletterRouter } from './routes/newsletter.js';
import { marketingRouter } from './routes/marketing.js';
import { marketingCampaignsRouter } from './routes/marketing-campaigns.js';
import { returnsRouter } from './routes/returns.js';
import { disputesRouter } from './routes/disputes.js';
import { openApiRouter } from './routes/openapi.js';
import { aiRouter } from './routes/ai.js';
import { creativeRouter } from './routes/creative.js';
import { experimentsRouter } from './routes/experiments.js';
import { featureFlagsRouter } from './routes/feature-flags.js';
import { analyticsRouter } from './routes/analytics.js';
import { feedsRouter } from './routes/feeds.js';
import { bannersRouter } from './routes/banners.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import { requestLogger } from './middleware/request-logger.js';
import { correlationId } from './middleware/correlation-id.js';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.storegrill.net'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/([a-z0-9-]+\.)?storegrill\.net$/i.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(correlationId);
app.use(requestLogger);
app.use(csrfProtection);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many checkout attempts. Please try again later.' } },
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/auth/oauth', oauthRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/home', homeRouter);
app.use('/api/v1/brands', brandsRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', checkoutLimiter, ordersRouter);
app.use('/api/v1/vendors', vendorsRouter);
app.use('/api/v1/deals', dealsRouter);
app.use('/api/v1/regions', regionsRouter);
app.use('/api/v1/imports', importsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/i18n', i18nRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/payments/webhook', paymentsWebhookRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/push', pushRouter);
app.use('/api/v1/shipping', shippingRouter);
app.use('/api/v1/tracking', trackingRouter);
app.use('/api/v1/tracking/webhook', carrierWebhookRouter);
app.use('/api/v1/tax', taxRouter);
app.use('/api/v1/blog', blogRouter);
app.use('/api/v1/newsletter', newsletterRouter);
app.use('/api/v1/vendor/marketing', marketingRouter);
app.use('/api/v1/marketing/campaigns', marketingCampaignsRouter);
app.use('/api/v1/returns', returnsRouter);
app.use('/api/v1/disputes', disputesRouter);
app.use('/api/v1/docs', openApiRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/creative', creativeRouter);
app.use('/api/v1/experiments', experimentsRouter);
app.use('/api/v1/feature-flags', featureFlagsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/feeds', feedsRouter);
app.use('/api/v1/banners', bannersRouter);

app.use(errorHandler);

export default app;
