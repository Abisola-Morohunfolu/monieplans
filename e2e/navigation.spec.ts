import { test, expect } from '@playwright/test'

test('each authenticated page renders its heading', async ({ page }) => {
  const routes: { path: string; heading: string }[] = [
    { path: '/budgets?month=2026-09', heading: 'Budget' },
    { path: '/transactions', heading: 'Transactions' },
    { path: '/profile', heading: 'Profile & Settings' },
  ]

  for (const { path, heading } of routes) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
  }
})

test('sidebar navigation switches between pages', async ({ page }) => {
  await page.goto('/budgets?month=2026-09')
  await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible()

  await page.getByRole('link', { name: 'Transactions' }).click()
  await expect(
    page.getByRole('heading', { name: 'Transactions' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(
    page.getByRole('heading', { name: 'Profile & Settings' }),
  ).toBeVisible()
})
