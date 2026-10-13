import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Browser, type Page } from '@playwright/test';

const API = 'http://localhost:8787';
const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const next = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
next.setUTCMonth(next.getUTCMonth() + 1);
const month = next.toISOString().slice(0, 7);
const password = 'review-password-123';
test.use({ storageState: { cookies: [], origins: [] } });

async function account(browser: Browser, name: string, limit: number) {
  const email = `review-${randomUUID()}@example.test`;
  const context = await browser.newContext();
  try {
    const signup = await context.request.post(`${API}/api/auth/sign-up/email`, {
      data: { name, email, password },
    });
    expect(signup.ok(), await signup.text()).toBe(true);
    const directory = join(
      process.cwd(),
      '.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
    );
    const file = readdirSync(directory).find(
      (f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite',
    );
    if (!file) throw new Error('Local test database not found');
    execFileSync('sqlite3', [
      join(directory, file),
      `PRAGMA busy_timeout=5000; UPDATE user SET email_verified=1 WHERE email='${email}';`,
    ]);
    expect(
      (
        await context.request.post(`${API}/api/auth/sign-in/email`, {
          data: { email, password },
        })
      ).ok(),
    ).toBe(true);
    const user = (await (
      await context.request.get(`${API}/api/users/me`)
    ).json()) as { id: string };
    const created = await context.request.put(`${API}/api/budgets/${month}`);
    expect(created.ok()).toBe(true);
    const plan = (await created.json()) as { revision: number };
    expect(
      (
        await context.request.put(`${API}/api/budgets/${month}/assignments`, {
          data: {
            spendingLimit: limit,
            revision: plan.revision,
            assignments: [],
          },
        })
      ).ok(),
    ).toBe(true);
    return { email, id: user.id };
  } finally {
    await context.close();
  }
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/budgets/);
}

for (const width of [390, 1440]) {
  test(`logout isolates accounts and preserves their own drafts at ${width}px`, async ({
    page,
    browser,
  }) => {
    const alice = await account(browser, 'Draft Alice', 1000);
    const bob = await account(browser, 'Draft Bob', 2000);
    await page.setViewportSize({ width, height: 1000 });
    await login(page, alice.email);
    await page.goto(`/budgets?month=${month}`);
    const limit = page.getByLabel('Monthly spending limit (NGN)');
    await expect(limit).toHaveValue('1000');
    await limit.fill('1500');
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || 'null')?.limit,
        `plan-draft:${alice.id}:${month}`,
      ),
    ).toBe('1500');
    await page.getByRole('link', { name: 'Profile and settings' }).click();
    const logout = page.getByRole('button', { name: 'Sign out', exact: true });
    await expect(logout).toBeVisible();
    await page.screenshot({
      path: `test-results/profile-logout-${width}.png`,
      fullPage: true,
    });
    await logout.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/login/);
    expect(
      await page.request
        .get(`${API}/api/budgets/${month}`)
        .then((r) => r.status()),
    ).toBe(401);
    // Keep the SPA alive across account changes so this also exercises cached queries.
    await page.getByLabel('Email', { exact: true }).fill(bob.email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/budgets/);
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(limit).toHaveValue('2000');
    await expect(
      page.getByRole('button', { name: 'Discard draft' }),
    ).toHaveCount(0);
    await limit.fill('2500');
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || 'null')?.limit,
        `plan-draft:${bob.id}:${month}`,
      ),
    ).toBe('2500');
    await page.getByRole('link', { name: 'Profile and settings' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email', { exact: true }).fill(alice.email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/budgets/);
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(limit).toHaveValue('1500');
    await page.getByRole('button', { name: 'Save plan', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Save plan', exact: true }),
    ).toHaveCount(0);
    const saved = await (
      await page.request.get(`${API}/api/budgets/${month}/summary`)
    ).json();
    expect(saved.spendingLimit).toBe(1500);
  });
}

test('failed logout retains the session and offers a retry', async ({
  page,
  browser,
}) => {
  const user = await account(browser, 'Logout retry', 1000);
  await login(page, user.email);
  await page.getByRole('link', { name: 'Profile and settings' }).click();
  await page.route('**/api/auth/sign-out', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Sign out is temporarily unavailable. Try again.' },
    }),
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Sign out is temporarily unavailable. Try again.',
  );
  await expect(page).toHaveURL(/\/profile/);
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toBeEnabled();
  await page.unroute('**/api/auth/sign-out');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
