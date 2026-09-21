import { test, expect } from '@playwright/test'

test('budget page shows month, stats and log-transaction action', async ({
  page,
}) => {
  await page.goto('/budgets?month=2026-09')
  await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible()
  await expect(page.getByText('September 2026')).toBeVisible()
  await expect(page.getByText('Assigned')).toBeVisible()
  await expect(page.getByText('To assign')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Log transaction' }),
  ).toBeVisible()
})
