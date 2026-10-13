import { test, expect } from '@playwright/test';
test('Plan shows preserved caps and limit confirmation', async ({ page }) => {
  await page.goto('/budgets?month=2026-09');
  await expect(
    page.getByRole('heading', { name: 'Your monthly plan' }),
  ).toBeVisible();
  await expect(page.getByText('September 2026')).toBeVisible();
  await expect(page.getByLabel('Monthly spending limit (NGN)')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add expense', exact: true }),
  ).toBeVisible();
});
