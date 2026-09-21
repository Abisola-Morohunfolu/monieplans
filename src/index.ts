import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { getAuth } from './auth';
import { allowedOrigins } from './auth/config';
import { authMiddleware } from './shared/middleware';
import { usersRouter } from './routes/users';
import { categoriesRouter } from './routes/categories';
import { budgetsRouter } from './routes/budgets';
import { transactionsRouter } from './routes/transactions';

export interface Env {
  DB: D1Database;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET: string;
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  EMAIL?: SendEmail;
  EMAIL_FROM?: string;
  EMAIL_PROVIDER?: 'cloudflare' | 'resend';
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use('/api/*', async (ctx, next) => {
  const { auth, db } = getAuth(ctx.env);
  ctx.set('auth', auth);
  ctx.set('db', db);
  await next();
});

app.all('/api/auth/*', async (c) => {
  return c.get('auth').handler(c.req.raw);
});

app.use('/api/users/*', authMiddleware);
app.use('/api/budgets/*', authMiddleware);
app.use('/api/categories/*', authMiddleware);
app.use('/api/transactions/*', authMiddleware);

app.route('/api/users', usersRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/budgets', budgetsRouter);
app.route('/api/transactions', transactionsRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as never);
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  let details: string | undefined;
  if (err instanceof Error) {
    if (err.cause instanceof Error) details = err.cause.message;
    else if (typeof err.cause === 'string') details = err.cause;
  }
  console.error('[api] unhandled error', {
    message,
    details,
    stack: err instanceof Error ? err.stack : undefined,
  });
  return c.json({ error: message, details }, 500 as never);
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/', (c) => c.json({ name: 'monieplans-api', version: '0.1.0' }));

export default { fetch: app.fetch };

export { app };
