import './lib/express-async-patch.js';
import './load-env.js';
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
import { errorHandler } from './middleware/errorHandler.js';

export { prisma } from './db/prisma.js';
import { prisma } from './db/prisma.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(helmet());
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

const isProd = process.env.NODE_ENV === 'production';

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
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/auth/oauth', oauthRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/vendors', vendorsRouter);
app.use('/api/v1/deals', dealsRouter);
app.use('/api/v1/regions', regionsRouter);
app.use('/api/v1/imports', importsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/i18n', i18nRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/payments/webhook', paymentsWebhookRouter);

app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    if (process.env.DISABLE_IMPORT_WORKER !== '1') {
      const { startScheduler } = await import('./services/scheduler.js');
      startScheduler(prisma);
    }
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
