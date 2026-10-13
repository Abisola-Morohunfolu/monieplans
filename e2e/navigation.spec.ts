import { test, expect } from '@playwright/test';

test('each authenticated page renders its heading', async ({ page }) => {
  const routes: { path: string; heading: string }[] = [
    { path: '/budgets?month=2026-09', heading: 'Your monthly plan' },
    { path: '/transactions', heading: 'Activity' },
    { path: '/profile', heading: 'Profile & Settings' },
  ];

  for (const { path, heading } of routes) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
  }
});

test('sidebar navigation switches between pages', async ({ page }) => {
  await page.goto('/budgets?month=2026-09');
  await expect(
    page.getByRole('heading', { name: 'Your monthly plan' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Activity' }).click();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();

  await page.getByRole('link', { name: 'Profile and settings' }).click();
  await expect(
    page.getByRole('heading', { name: 'Profile & Settings' }),
  ).toBeVisible();
});
