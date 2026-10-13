import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
const API = 'http://localhost:8787';
const month = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: '2-digit',
}).format(new Date());
let fuel: string, food: string;
async function seed(request: APIRequestContext) {
  let categories = (
    await (await request.get(API + '/api/categories?limit=100')).json()
  ).data as { id: string; name: string; kind: string }[];
  for (const name of ['Fuel', 'Weekly groceries'])
    if (!categories.some((c) => c.name === name)) {
      const result = await request.post(API + '/api/categories', {
        data: { name, kind: 'expense' },
      });
      expect(result.ok()).toBeTruthy();
    }
  categories = (
    await (await request.get(API + '/api/categories?limit=100')).json()
  ).data;
  fuel = categories.find((c) => c.name === 'Fuel')!.id;
  food = categories.find((c) => c.name === 'Weekly groceries')!.id;
  await request.put(API + '/api/budgets/' + month);
  const summary = await (
    await request.get(`${API}/api/budgets/${month}/summary`)
  ).json();
  const saved = await request.put(`${API}/api/budgets/${month}/assignments`, {
    data: {
      spendingLimit: 500000,
      revision: summary.revision,
      assignments: categories
        .filter((c) => c.kind === 'expense')
        .map((c) => ({
          categoryId: c.id,
          assigned: c.id === fuel ? 120000 : c.id === food ? 200000 : 0,
          pacing: c.id === food ? 'weekly' : 'monthly',
        })),
    },
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
}
test.beforeEach(async ({ request }) => seed(request));
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const width of [360, 390, 430, 1440])
  test(`weekly overview and monthly-only quick entry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await expect(
      page.getByText('weekly available', { exact: false }),
    ).toBeVisible();
    await noOverflow(page);
    await page.goto(`/buckets/${fuel}?month=${month}`);
    await expect(
      page.getByRole('heading', { name: 'Fuel', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Monthly only', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Add expense', exact: true })
      .first()
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Add expense' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Take receipt photo' }),
    ).toBeVisible();
    expect(
      await page.getByLabel('Take receipt photo').getAttribute('capture'),
    ).toBe('environment');
    await page.getByRole('button', { name: 'Enter manually' }).click();
    await expect(page.getByLabel('Category', { exact: true })).toHaveValue(
      fuel,
    );
    await page.getByLabel('Amount', { exact: true }).fill('1234.56');
    await page.getByLabel('Merchant or recipient').fill(`Mobile Fuel ${width}`);
    await page
      .getByRole('button', { name: 'Save expense', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText(`Mobile Fuel ${width}`, { exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page.getByText(`Mobile Fuel ${width}`, { exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Transaction details' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(
      page.getByRole('button').filter({ hasText: `Mobile Fuel ${width}` }),
    ).toBeFocused();
    await page.screenshot({
      path: `test-results/bucket-${width}.png`,
      fullPage: true,
    });
  });
test('money move preview preserves the limit and has explicit balances', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/buckets/${fuel}?month=${month}`);
  await page.getByRole('button', { name: 'Move money', exact: true }).click();
  await page.getByLabel('Destination').selectOption(food);
  await page.getByLabel('Amount to move').fill('20000');
  await page.getByRole('button', { name: 'Preview move' }).click();
  await expect(
    page.getByRole('heading', { name: 'Revised weekly plan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirm move' }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Confirm move' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByText('To Weekly groceries', { exact: false }).first(),
  ).toBeVisible();
});
test('plan drafts survive month changes and enlarged text fits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`/budgets?month=${month}`);
  await page.getByLabel('Monthly spending limit (NGN)').fill('550000');
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByLabel('Monthly spending limit (NGN)')).toHaveValue(
    '550000',
  );
  await page.addStyleTag({ content: 'html{font-size:125%}' });
  await noOverflow(page);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await expect(page.getByLabel('Monthly spending limit (NGN)')).toHaveValue(
    '500000',
  );
});
test('review shows original targets and month-to-date report', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/review');
  await expect(
    page.getByRole('heading', { name: 'Monthly review' }),
  ).toBeVisible();
  await expect(page.getByText('Month-to-date', { exact: false })).toBeVisible();
  await expect(
    page.getByText('Original target', { exact: true }).first(),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: 'test-results/review-390.png',
    fullPage: true,
  });
});
test('receipt review handles category override, other-month date, failed-save drafts and split capture', async ({
  page,
}) => {
  const id = 'test-capture-1',
    oldMonth = '2026-09',
    extracted = {
      amount: 10000,
      occurredOn: '2026-09-20',
      payee: 'Fuel and groceries',
      currency: 'NGN',
      paymentStatus: 'completed',
      type: 'expense',
      suggestedCategoryId: food,
      confidence: 'high',
      warnings: [],
    };
  let saved: Record<string, unknown> | undefined,
    attempt = 0;
  await page.route('**/api/captures**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/captures' && route.request().method() === 'POST')
      return route.fulfill({ json: { id, identicalUpload: false } });
    if (url.pathname.endsWith('/confirm')) {
      saved = route.request().postDataJSON();
      attempt++;
      return route.fulfill(
        attempt === 1
          ? { status: 503, json: { error: 'Temporary save failure. Retry.' } }
          : { status: 201, json: { id: 'saved' } },
      );
    }
    if (url.pathname.endsWith('/image')) return route.fulfill({ status: 404 });
    if (url.pathname === `/api/captures/${id}`)
      return route.fulfill({
        json: {
          id,
          status: 'ready',
          attempt: 1,
          error: null,
          transactionId: null,
          defaultCategoryId: fuel,
          openedMonth: month,
          extracted,
          likelyDuplicates: [],
        },
      });
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/buckets/${fuel}?month=${month}`);
  await page
    .getByRole('button', { name: 'Add expense', exact: true })
    .first()
    .click();
  await page.getByLabel('Upload receipt or screenshot').setInputFiles({
    name: 'receipt.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect(
    page.getByRole('dialog', { name: 'Review capture' }),
  ).toBeVisible();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue(fuel);
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(
    `${oldMonth}-20`,
  );
  await page.getByRole('button', { name: 'Add category split' }).click();
  await page.getByLabel('Split 1 amount').fill('8000');
  await page.getByRole('button', { name: 'Add category split' }).click();
  await page.getByLabel('Split 2 category').selectOption(food);
  await page.getByLabel('Split 2 amount').fill('2000');
  await page.getByLabel('I confirm the date', { exact: false }).check();
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(
    page.getByText('Temporary save failure. Retry.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Split 1 amount')).toHaveValue('8000');
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saved).toMatchObject({
    categoryId: fuel,
    occurredOn: '2026-09-20',
    splits: [
      { categoryId: fuel, amount: 8000 },
      { categoryId: food, amount: 2000 },
    ],
    dateAcknowledged: true,
  });
});
test('native dialog traps keyboard focus and restores it', async ({ page }) => {
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', {
    name: 'Add expense',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.querySelector('dialog')?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('stale plan drafts can refresh balances without discarding edits', async ({
  page,
  request,
}) => {
  await page.goto(`/budgets?month=${month}`);
  await page.getByLabel('Monthly spending limit (NGN)').fill('550000');
  const result = await request.post(API + '/api/transactions', {
    data: {
      type: 'expense',
      amount: 1,
      occurredOn: `${month}-01`,
      payee: 'Draft conflict fixture',
    },
  });
  expect(result.ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Save plan', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Refresh draft balances' }),
  ).toBeVisible();
  await expect(page.getByLabel('Monthly spending limit (NGN)')).toHaveValue(
    '550000',
  );
  await page.getByRole('button', { name: 'Refresh draft balances' }).click();
  await page.getByRole('button', { name: 'Save plan', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Save plan', exact: true }),
  ).toHaveCount(0);
});

test('failed image capture keeps manual entry available with a pending status', async ({
  page,
}) => {
  const id = 'failed-capture',
    saved: Record<string, unknown>[] = [];
  await page.route('**/api/captures**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/confirm')) {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { id: 'saved' } });
    }
    if (url.pathname === `/api/captures/${id}`)
      return route.fulfill({
        json: {
          id,
          status: 'failed',
          error: 'Could not read this image.',
          attempt: 5,
          transactionId: null,
          defaultCategoryId: fuel,
          openedMonth: month,
          extracted: null,
          likelyDuplicates: [],
        },
      });
    if (route.request().method() === 'POST')
      return route.fulfill({ json: { id } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/buckets/${fuel}?month=${month}`);
  await page
    .getByRole('button', { name: 'Add expense', exact: true })
    .first()
    .click();
  await page
    .getByLabel('Upload receipt or screenshot')
    .setInputFiles({
      name: 'blurry.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
  await page
    .getByRole('button', { name: 'Enter manually and attach this image' })
    .click();
  await expect(page.getByLabel('Payment status')).toHaveValue('pending');
  await page.getByLabel('Amount', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saved[0]).toMatchObject({
    manualReview: true,
    paymentStatus: 'pending',
    categoryId: fuel,
  });
});
