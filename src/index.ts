import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { getAuth } from './auth';
import { authMiddleware } from './shared/middleware';
import { usersRouter } from './routes/users';
import { categoriesRouter } from './routes/categories';
import { budgetsRouter } from './routes/budgets';
import { expensesRouter } from './routes/expenses';
import { fixedExpensesRouter } from './routes/fixed-expenses';
import { goalsRouter } from './routes/goals';
import { statementsRouter } from './routes/statements';
import { analyticsRouter } from './routes/analytics';
import { processReceiptMessages } from './consumers/receipt-processing';
import { processStatementMessages } from './consumers/statement-processing';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  RECEIPT_PROCESSING: Queue;
  STATEMENT_PROCESSING: Queue;
  BETTER_AUTH_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', credentials: true, allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));

app.use('/api/*', async (c, next) => {
  const { auth, db } = getAuth(c.env.DB);
  c.set('auth', auth as never);
  c.set('db', db as never);
  await next();
});

app.all('/api/auth/*', async (c) => {
  return c.get('auth').handler(c.req.raw);
});

app.use('/api/users/*', authMiddleware);
app.use('/api/budgets/*', authMiddleware);
app.use('/api/categories/*', authMiddleware);
app.use('/api/expenses/*', authMiddleware);
app.use('/api/fixed-expenses/*', authMiddleware);
app.use('/api/goals/*', authMiddleware);
app.use('/api/statements/*', authMiddleware);
app.use('/api/analytics/*', authMiddleware);

app.route('/api/users', usersRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/budgets', budgetsRouter);
app.route('/api/expenses', expensesRouter);
app.route('/api/fixed-expenses', fixedExpensesRouter);
app.route('/api/goals', goalsRouter);
app.route('/api/statements', statementsRouter);
app.route('/api/analytics', analyticsRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as never);
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return c.json({ error: message }, 500 as never);
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/', (c) => c.json({ name: 'monieplans-api', version: '0.1.0' }));

async function queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  switch (batch.queue) {
    case 'receipt-processing':
      return processReceiptMessages(batch as unknown as MessageBatch<{ receiptId: string; userId: string; fileName: string; storagePath: string }>, env);
    case 'statement-processing':
      return processStatementMessages(batch as unknown as MessageBatch<{ uploadId: string; userId: string; budgetPeriodId: string | null; fileName: string; storagePath: string }>, env);
  }
}

export default { fetch: app.fetch, queue };

export { app };

