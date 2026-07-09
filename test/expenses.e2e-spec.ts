import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import { DRIZZLE } from '../src/database/database.provider';
import * as schema from '../src/database/schema';

jest.setTimeout(30000);

const TEST_USER_ID = `e2e-expenses-${Date.now()}`;

// The budget period spans exactly four 7-day weeks so equal_split yields a clean 7000/week.
const PERIOD_START = '2026-07-01';
const PERIOD_END = '2026-07-28';
const BUDGET_CAP = 28000;

describe('Expenses (e2e)', () => {
  let app: INestApplication<App>;
  let db: NodePgDatabase<typeof schema> & { $client: Pool };
  let budgetPeriodId: string;
  let firstWeekId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: TEST_USER_ID };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts so routes and validation behave like production.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    db = app.get(DRIZZLE);
    await db.insert(schema.user).values({
      id: TEST_USER_ID,
      name: 'Expenses E2E User',
      email: `${TEST_USER_ID}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Deleting the user cascades to budget periods, allocations, expenses, and receipts.
    await db.delete(schema.user).where(eq(schema.user.id, TEST_USER_ID));
    await app.close();
    // The DRIZZLE provider never closes its pg Pool on shutdown; end it so jest can exit.
    await db.$client.end();
  });

  describe('budget activation', () => {
    it('creates an active budget and generates weekly allocations when activateImmediately is set', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/budgets')
        .send({
          periodStartDate: PERIOD_START,
          periodEndDate: PERIOD_END,
          planningMode: 'spending_cap_based',
          monthlyBudgetCapAmount: BUDGET_CAP,
          currency: 'NGN',
          activateImmediately: true,
        })
        .expect(201);

      expect(res.body.status).toBe('active');
      budgetPeriodId = res.body.id;

      const weeks = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.budgetPeriodId, budgetPeriodId))
        .orderBy(schema.weeklyBudgetAllocations.weekIndex);

      expect(weeks).toHaveLength(4);
      expect(weeks.map((w) => w.weekStartDate)).toEqual([
        '2026-07-01',
        '2026-07-08',
        '2026-07-15',
        '2026-07-22',
      ]);
      weeks.forEach((w) => {
        expect(parseFloat(w.finalPlannedAmount)).toBe(BUDGET_CAP / 4);
        expect(parseFloat(w.remainingAmountCache ?? '0')).toBe(BUDGET_CAP / 4);
      });
      firstWeekId = weeks[0].id;
    });
  });

  describe('manual expenses', () => {
    let expenseId: string;

    it('creates an expense, resolving the active period and the week containing expenseDate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/expenses')
        .send({ amount: 1500, expenseDate: '2026-07-02', description: 'Coffee and donuts' })
        .expect(201);

      expect(res.body.budgetPeriodId).toBe(budgetPeriodId);
      expect(res.body.weeklyBudgetAllocationId).toBe(firstWeekId);
      expect(res.body.sourceType).toBe('manual');
      expect(parseFloat(res.body.amount)).toBe(1500);
      expenseId = res.body.id;
    });

    it('updates the weekly allocation caches on create', async () => {
      const [week] = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.id, firstWeekId));
      expect(parseFloat(week.actualSpentAmountCache ?? '0')).toBe(1500);
      expect(parseFloat(week.remainingAmountCache ?? '0')).toBe(7000 - 1500);
    });

    it('lists and filters expenses', async () => {
      // A second expense in week 2 to filter against.
      await request(app.getHttpServer())
        .post('/api/expenses')
        .send({ amount: 500, expenseDate: '2026-07-09', merchantName: 'Uber' })
        .expect(201);

      const all = await request(app.getHttpServer()).get('/api/expenses').expect(200);
      expect(all.body).toHaveLength(2);

      const byDate = await request(app.getHttpServer())
        .get('/api/expenses')
        .query({ startDate: '2026-07-01', endDate: '2026-07-07' })
        .expect(200);
      expect(byDate.body).toHaveLength(1);
      expect(byDate.body[0].id).toBe(expenseId);

      const byWeek = await request(app.getHttpServer())
        .get('/api/expenses')
        .query({ weeklyBudgetAllocationId: firstWeekId })
        .expect(200);
      expect(byWeek.body).toHaveLength(1);

      const bySearch = await request(app.getHttpServer())
        .get('/api/expenses')
        .query({ search: 'coffee' })
        .expect(200);
      expect(bySearch.body).toHaveLength(1);
      expect(bySearch.body[0].description).toBe('Coffee and donuts');

      const byMerchant = await request(app.getHttpServer())
        .get('/api/expenses')
        .query({ search: 'uber' })
        .expect(200);
      expect(byMerchant.body).toHaveLength(1);
    });

    it('gets a single expense', async () => {
      const res = await request(app.getHttpServer()).get(`/api/expenses/${expenseId}`).expect(200);
      expect(res.body.id).toBe(expenseId);
      expect(res.body.description).toBe('Coffee and donuts');
    });

    it('recalculates caches when an expense amount is updated', async () => {
      await request(app.getHttpServer())
        .patch(`/api/expenses/${expenseId}`)
        .send({ amount: 2000 })
        .expect(200);

      const [week] = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.id, firstWeekId));
      expect(parseFloat(week.actualSpentAmountCache ?? '0')).toBe(2000);
      expect(parseFloat(week.remainingAmountCache ?? '0')).toBe(7000 - 2000);
    });

    it('moves the expense to the matching week when expenseDate changes', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/expenses/${expenseId}`)
        .send({ expenseDate: '2026-07-10' })
        .expect(200);

      expect(res.body.weeklyBudgetAllocationId).not.toBe(firstWeekId);

      // Old week's cache drops back to zero; new week now carries both expenses (2000 + 500).
      const [oldWeek] = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.id, firstWeekId));
      expect(parseFloat(oldWeek.actualSpentAmountCache ?? '0')).toBe(0);

      const [newWeek] = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.id, res.body.weeklyBudgetAllocationId));
      expect(parseFloat(newWeek.actualSpentAmountCache ?? '0')).toBe(2500);
    });

    it('soft-deletes an expense and recalculates the cache', async () => {
      const before = await request(app.getHttpServer()).get(`/api/expenses/${expenseId}`).expect(200);
      const weekId = before.body.weeklyBudgetAllocationId;

      await request(app.getHttpServer()).delete(`/api/expenses/${expenseId}`).expect(200);

      await request(app.getHttpServer()).get(`/api/expenses/${expenseId}`).expect(404);

      const [row] = await db
        .select()
        .from(schema.expenseEntries)
        .where(eq(schema.expenseEntries.id, expenseId));
      expect(row.deletedAt).not.toBeNull();

      const [week] = await db
        .select()
        .from(schema.weeklyBudgetAllocations)
        .where(eq(schema.weeklyBudgetAllocations.id, weekId));
      expect(parseFloat(week.actualSpentAmountCache ?? '0')).toBe(500);
    });

    it('rejects an expense with an unknown category', async () => {
      await request(app.getHttpServer())
        .post('/api/expenses')
        .send({
          amount: 100,
          expenseDate: '2026-07-03',
          categoryId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);
    });

    it('rejects invalid payloads via validation', async () => {
      await request(app.getHttpServer())
        .post('/api/expenses')
        .send({ amount: -5, expenseDate: 'not-a-date' })
        .expect(400);
    });
  });

  describe('receipt upload and mock parsing', () => {
    let receiptId: string;

    it('uploads a receipt and starts processing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/expenses/receipts/upload')
        .attach('file', Buffer.from('fake image bytes'), 'receipt_450.png')
        .expect(201);

      expect(res.body.parseStatus).toBe('processing');
      expect(res.body.fileName).toBe('receipt_450.png');
      receiptId = res.body.id;
    });

    it('parses the receipt asynchronously, extracting the amount from the filename', async () => {
      let receipt: any;
      // The mock parser fires after ~3s; poll up to 10s.
      for (let attempt = 0; attempt < 20; attempt++) {
        const res = await request(app.getHttpServer())
          .get(`/api/expenses/receipts/${receiptId}`)
          .expect(200);
        receipt = res.body;
        if (receipt.parseStatus === 'parsed') break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      expect(receipt.parseStatus).toBe('parsed');
      expect(parseFloat(receipt.parsedAmount)).toBe(450);
      expect(receipt.parsedMerchantName).toBeTruthy();
      expect(receipt.parsedExpenseDate).toBeTruthy();
    });

    it('creates an expense linked to the parsed receipt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/expenses')
        .send({ amount: 450, expenseDate: '2026-07-03', receiptId })
        .expect(201);

      expect(res.body.sourceType).toBe('receipt_upload');
      expect(res.body.receiptParseStatus).toBe('confirmed');
      // Merchant name falls back to the parsed one when not supplied.
      expect(res.body.merchantName).toBeTruthy();

      const [receipt] = await db
        .select()
        .from(schema.expenseEntryReceipts)
        .where(
          and(
            eq(schema.expenseEntryReceipts.id, receiptId),
            eq(schema.expenseEntryReceipts.userId, TEST_USER_ID),
          ),
        );
      expect(receipt.expenseEntryId).toBe(res.body.id);
      expect(receipt.parseStatus).toBe('confirmed');
    });

    it('404s for a receipt that does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/expenses/receipts/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
